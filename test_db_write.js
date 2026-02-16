
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Start db write test...');
    try {
        const testTeamName = 'Test Team ' + Date.now();
        console.log('Attempting to create team:', testTeamName);
        const team = await prisma.team.create({
            data: {
                name: testTeamName,
            },
        });
        console.log('Successfully created team:', team);

        console.log('Attempting to delete team...');
        await prisma.team.delete({
            where: { id: team.id },
        });
        console.log('Successfully deleted team.');
    } catch (e) {
        console.error('Error during db write test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
