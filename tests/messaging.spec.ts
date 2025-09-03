
import { test, expect } from './fixtures/auth';

test.describe('Messaging', () => {
  test('should access messages page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    
    // Click messages link
    await authenticatedPage.click('[data-testid="messages-link"]');
    
    // Should navigate to messages page
    await expect(authenticatedPage).toHaveURL('/messages');
    await expect(authenticatedPage.locator('[data-testid="conversations-list"]')).toBeVisible();
  });

  test('should start new conversation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // Click new message button
    await authenticatedPage.click('[data-testid="new-message-button"]');
    
    // Should show user search
    await expect(authenticatedPage.locator('[data-testid="user-search"]')).toBeVisible();
    
    // Search for user
    await authenticatedPage.fill('[data-testid="user-search-input"]', 'mod_tom');
    
    // Select user from results
    await authenticatedPage.click('[data-testid="user-search-result"]');
    
    // Should open conversation
    await expect(authenticatedPage.locator('[data-testid="message-input"]')).toBeVisible();
  });

  test('should send message', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/messages');
    
    // If there are existing conversations, click one
    const conversations = await authenticatedPage.locator('[data-testid="conversation-item"]');
    if (await conversations.count() > 0) {
      await conversations.first().click();
      
      // Send a message
      const messageText = 'Test message from automated test';
      await authenticatedPage.fill('[data-testid="message-input"]', messageText);
      await authenticatedPage.click('[data-testid="send-message-button"]');
      
      // Should show the message
      await expect(authenticatedPage.locator(`text=${messageText}`)).toBeVisible();
    }
  });
});
