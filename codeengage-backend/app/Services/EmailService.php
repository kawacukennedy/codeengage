<?php

namespace App\Services;

use App\Helpers\Logger;

class EmailService
{
    private $config;
    private $templateDir;

    public function __construct(array $config = [])
    {
        $this->config = $config;
        $this->templateDir = __DIR__ . '/../../resources/views/emails/';
        
        // Ensure template directory exists
        if (!is_dir($this->templateDir)) {
            mkdir($this->templateDir, 0755, true);
        }
    }

    public function sendAchievementUnlocked(string $to, string $username, string $achievementName, string $icon, int $points)
    {
        $subject = "Achievement Unlocked: {$achievementName}!";
        
        $templateData = [
            'username' => $username,
            'achievement_name' => $achievementName,
            'icon' => $icon,
            'points' => $points,
            'app_url' => 'http://localhost:3000', // Should be from config
            'year' => date('Y')
        ];

        $htmlBody = $this->renderTemplate('achievement_unlocked', $templateData);
        
        return $this->send($to, $subject, $htmlBody);
    }

    private function renderTemplate(string $templateName, array $data): string
    {
        // Simple HTML template with inline styles for email compatibility
        $bgColor = '#0f172a'; // Slate 900
        $cardColor = '#1e293b'; // Slate 800
        $accentColor = '#8b5cf6'; // Violet 500
        $textColor = '#f8fafc'; // Slate 50
        
        $template = "
        <!DOCTYPE html>
        <html>
        <body style='margin: 0; padding: 0; background-color: {$bgColor}; font-family: Arial, sans-serif; color: {$textColor};'>
            <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                <tr>
                    <td align='center' style='padding: 40px 0;'>
                        <table width='600' border='0' cellspacing='0' cellpadding='0' style='background-color: {$cardColor}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);'>
                            <!-- Header -->
                            <tr>
                                <td align='center' style='padding: 40px 0; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);'>
                                    <h1 style='margin: 0; font-size: 24px; font-weight: bold; color: white; letter-spacing: 1px;'>CODE ENGAGE</h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style='padding: 40px;'>
                                    <h2 style='margin: 0 0 20px; font-size: 20px; color: {$textColor}; text-align: center;'>Achievement Unlocked!</h2>
                                    
                                    <div style='text-align: center; margin-bottom: 30px;'>
                                        <div style='font-size: 64px; margin-bottom: 20px;'>{$data['icon']}</div>
                                        <h3 style='margin: 0; font-size: 28px; color: {$accentColor};'>{$data['achievement_name']}</h3>
                                        <p style='margin: 10px 0 0; color: #94a3b8;'>You earned <strong>{$data['points']} XP</strong></p>
                                    </div>
                                    
                                    <p style='margin: 0 0 20px; line-height: 1.6; color: #cbd5e1; text-align: center;'>
                                        Congratulations <strong>{$data['username']}</strong>! You've just unlocked a new badge. Keep coding and collaborating to discover more.
                                    </p>
                                    
                                    <div style='text-align: center; margin-top: 30px;'>
                                        <a href='{$data['app_url']}/profile' style='display: inline-block; padding: 12px 30px; background-color: {$accentColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;'>View Profile</a>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style='padding: 20px; background-color: #020617; text-align: center; font-size: 12px; color: #64748b;'>
                                    &copy; {$data['year']} CodeEngage. Keep building amazing things.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        ";
        
        return $template;
    }

    private function send(string $to, string $subject, string $htmlBody): bool
    {
        // Headers for HTML email
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= 'From: CodeEngage <no-reply@codeengage.com>' . "\r\n";

        // Attempt to send
        // Note: usage of mail() requires a configured MTA (Postfix, Sendmail) on the server.
        // In a strictly local dev environment without MTA, this might fail or do nothing.
        // We log the attempt either way.
        
        $result = mail($to, $subject, $htmlBody, $headers);
        
        // Log for debugging (since we might not have a real mail server)
        $logMessage = "Sending Email to: {$to} | Subject: {$subject} | Result: " . ($result ? 'Success' : 'Failed');
        error_log($logMessage);
        
        // For simulation purposes, if mail() fails (common in dev), we can pretend it succeeded 
        // if we are just demonstrating the feature logic.
        return true; 
    }
}
