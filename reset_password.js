
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    await prisma.user.update({
        where: { username: 'admin' },
        data: { password: hashedPassword }
    });

    console.log('Password for admin reset to: admin1234');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
