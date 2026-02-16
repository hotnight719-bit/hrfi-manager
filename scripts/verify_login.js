
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'password123';

    console.log(`Testing login for user: ${username}`);

    try {
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            console.error('User not found!');
            return;
        }

        console.log('User found:', user.username);
        console.log('Stored hash:', user.password);

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (passwordsMatch) {
            console.log('✅ Password match! Login logic is correct.');
        } else {
            console.error('❌ Password mismatch!');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
