import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SAMPLE_AVATARS = [
  'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/woman.jpg',
  'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/man.jpg',
];

async function main() {
  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('Password123', 12);

  // ── Admin ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@connecthub.app' },
    update: {},
    create: {
      email: 'admin@connecthub.app',
      username: 'admin',
      passwordHash: password,
      role: 'ADMIN',
      isVerified: true,
      profile: { create: { displayName: 'ConnectHub Admin', bio: 'Keeping the platform safe.' } },
    },
  });

  // ── Regular users ──
  const userSeeds = [
    { username: 'sarah_dev', displayName: 'Sarah Chen', bio: 'Full-stack engineer. Building cool things. 🚀', location: 'San Francisco, CA' },
    { username: 'mike_design', displayName: 'Mike Johnson', bio: 'UI/UX Designer | Coffee enthusiast ☕', location: 'New York, NY' },
    { username: 'priya_writes', displayName: 'Priya Patel', bio: 'Writer & storyteller. Words are my craft. ✍️', location: 'London, UK' },
    { username: 'alex_photo', displayName: 'Alex Rivera', bio: 'Photographer capturing moments 📸', location: 'Austin, TX' },
    { username: 'jordan_codes', displayName: 'Jordan Kim', bio: 'Open source contributor. TypeScript fan.', location: 'Seattle, WA' },
  ];

  const users = [];
  for (const [i, u] of userSeeds.entries()) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        email: `${u.username}@example.com`,
        username: u.username,
        passwordHash: password,
        isVerified: true,
        profile: {
          create: {
            displayName: u.displayName,
            bio: u.bio,
            location: u.location,
            avatarUrl: SAMPLE_AVATARS[i % SAMPLE_AVATARS.length],
            website: `https://${u.username}.dev`,
          },
        },
      },
    });
    users.push(user);
  }

  // ── Follows: everyone follows admin, and a web of follows among users ──
  for (const user of users) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: admin.id } },
      update: {},
      create: { followerId: user.id, followingId: admin.id },
    });
  }
  for (let i = 0; i < users.length; i++) {
    const next = users[(i + 1) % users.length];
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: users[i].id, followingId: next.id } },
      update: {},
      create: { followerId: users[i].id, followingId: next.id },
    });
  }
  // Recompute counters.
  for (const user of [...users, admin]) {
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
    ]);
    await prisma.profile.update({ where: { userId: user.id }, data: { followersCount, followingCount } });
  }

  // ── Posts ──
  const postSeeds = [
    'Just shipped a new feature using #NextJS and #TypeScript. The DX is incredible! 🎉',
    "Coffee shop coding session today. Anyone else more productive away from the office? #buildinpublic",
    'New blog post is live! Diving deep into PostgreSQL indexing strategies. Link in bio.',
    'Hot take: dark mode should be the default everywhere. #darkmode #design',
    'Working on something exciting with @sarah_dev — more details soon 👀',
    'Sunset over the bay tonight. Sometimes you just need to put the laptop down. 🌅',
    'PSA: always validate your inputs on both client AND server. #webdev #security',
    'Three years ago today I wrote my first line of code. What a journey. #grateful',
  ];

  const posts = [];
  for (let i = 0; i < postSeeds.length; i++) {
    const author = users[i % users.length];
    const post = await prisma.post.create({
      data: { authorId: author.id, content: postSeeds[i] },
    });
    posts.push(post);
    await prisma.profile.update({ where: { userId: author.id }, data: { postsCount: { increment: 1 } } });
  }

  // Index hashtags from seeded posts.
  const tagRe = /#([a-zA-Z0-9_]+)/g;
  for (const post of posts) {
    const tags = [...post.content.matchAll(tagRe)].map((m) => m[1].toLowerCase());
    for (const tag of [...new Set(tags)]) {
      const hashtag = await prisma.hashtag.upsert({
        where: { tag },
        update: { useCount: { increment: 1 } },
        create: { tag, useCount: 1 },
      });
      await prisma.postHashtag.create({ data: { postId: post.id, hashtagId: hashtag.id } }).catch(() => {});
    }
  }

  // ── Likes & comments ──
  for (const post of posts) {
    const likers = users.filter(() => Math.random() > 0.4);
    for (const liker of likers) {
      await prisma.like
        .create({ data: { userId: liker.id, postId: post.id } })
        .catch(() => {}); // ignore unique constraint dupes
    }
  }

  const commentSeeds = ['Love this! 🔥', 'So true, totally agree.', 'Great point, thanks for sharing!', 'This is awesome 👏'];
  for (const post of posts.slice(0, 5)) {
    const commenter = users[(users.indexOf(users.find((u) => u.id === post.authorId)!) + 1) % users.length];
    await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: commenter.id,
        content: commentSeeds[Math.floor(Math.random() * commentSeeds.length)],
      },
    });
  }

  // ── A direct conversation with a couple messages ──
  const conversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: { create: [{ userId: users[0].id }, { userId: users[1].id }] },
    },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, senderId: users[0].id, content: 'Hey! Saw your latest post, awesome work 🎉' },
      { conversationId: conversation.id, senderId: users[1].id, content: 'Thank you! Means a lot 🙏' },
      { conversationId: conversation.id, senderId: users[0].id, content: 'Want to collab on something soon?' },
    ],
  });

  console.log('✅ Seed complete.');
  console.log('   Login with any seeded user, e.g.:');
  console.log('   email: sarah_dev@example.com / password: Password123');
  console.log('   admin: admin@connecthub.app / password: Password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
