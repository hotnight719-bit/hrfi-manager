
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing DB Access...');
        // Just try to query, even if empty
        const count = await prisma.team.count();
        console.log('DB Connection Successful. Team count:', count);
    } catch (e) {
        console.error('DB Connection Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
