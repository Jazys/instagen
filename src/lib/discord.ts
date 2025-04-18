/**
 * Discord webhook utility functions
 */

/**
 * Sends a notification to Discord when a new user signs up
 * @param user User information to include in the notification
 */
export async function notifyDiscordUserInfo(user: {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: any;
  credit_balance?: number;
}) {
  try {
    // Get the Discord webhook URL from environment variables
    const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
    
     
    if (!webhookUrl) {
      console.warn('Discord webhook URL not configured. Skipping notification.');
      return;
    }
    
    // Format the created_at date if available
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown';
    
    // Create a message with user information
    const message = {
      embeds: [
        {
          title: '🎉 New User Registered!',
          color: 0x5865F2, // Discord blurple color
          fields: [
            {
              name: 'User ID',
              value: user.id,
              inline: true,
            },
            {
              name: 'Email',
              value: user.email || 'Not provided',
              inline: true,
            },
            {
              name: 'Registered At',
              value: createdAt,
              inline: true,
            },
            // Include additional user metadata if available
            ...(user.user_metadata ? [
              {
                name: 'Name',
                value: user.user_metadata.full_name || user.user_metadata.name || 'Not provided',
                inline: true,
              }
            ] : []),
            ...(user.credit_balance ? [
              {
                name: 'new_balance',
                value: user.credit_balance || 'Not provided',
                inline: true,
              }
            ] : []),
          ],
          footer: {
            text: 'Instagen Platform',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
    
    // Send the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      throw new Error(`Discord webhook failed with status ${response.status}`);
    }
    
    console.log('Discord notification sent successfully for new user:', user.id);
    return true;
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    // Don't throw the error - we don't want to interrupt the user registration flow
    return false;
  }
} 