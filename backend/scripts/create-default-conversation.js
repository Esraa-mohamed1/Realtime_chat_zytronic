import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultConversation() {
  try {
    console.log('Creating default conversation...');
    
    // Check if default conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: { id: 'default' }
    });

    if (existingConversation) {
      console.log('Default conversation already exists');
      return;
    }

    // Create default conversation
    const conversation = await prisma.conversation.create({
      data: {
        id: 'default',
        createdAt: new Date()
      }
    });

    console.log('✅ Default conversation created:', conversation.id);
  } catch (error) {
    console.error('❌ Error creating default conversation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultConversation();
