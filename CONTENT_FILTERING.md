# Content Filtering System

## Overview
Gamefolio now includes a comprehensive content filtering system using the `bad-words` package to automatically detect and prevent inappropriate language across the platform.

## Features
- **Automatic Profanity Detection**: Uses the bad-words library with built-in word lists
- **Custom Word Management**: Admins can add or remove custom words from the filter
- **Content Validation**: Validates text content with configurable options
- **Clean Content Generation**: Automatically replaces inappropriate content with asterisks
- **Detailed Error Messages**: Provides specific feedback to users about content issues

## Protected Endpoints

### User-Generated Content
- **Comments**: `/api/clips/:id/comments` - Max 1000 characters
- **Messages**: `/api/messages` and `/api/messages/start` - Max 2000 characters  
- **User Profiles**: `/api/users/:id` (PATCH) - Bio (500 chars), Display Name (50 chars), Location (100 chars), Website (200 chars)
- **Clip Uploads**: `/api/clips` - Title (100 chars), Description (500 chars)
- **Screenshot Uploads**: `/api/screenshots/upload` - Title (100 chars), Description (500 chars)

### Validation Rules
- **No Profanity**: Content containing inappropriate language is rejected
- **Character Limits**: Each field has appropriate maximum length limits
- **Required Fields**: Some fields like titles are required and cannot be empty

## Admin Management API

### Check Content
**POST** `/api/admin/content-filter/check`
```json
{
  "content": "Text to check"
}
```
Response:
```json
{
  "originalContent": "Text to check",
  "containsProfanity": false,
  "profaneWords": [],
  "cleanedContent": "Text to check"
}
```

### Add Custom Words
**POST** `/api/admin/content-filter/add-words`
```json
{
  "words": ["word1", "word2"]
}
```

### Remove Words
**POST** `/api/admin/content-filter/remove-words`
```json
{
  "words": ["word1", "word2"]
}
```

### Validate Content
**POST** `/api/admin/content-filter/validate`
```json
{
  "content": "Text to validate",
  "options": {
    "allowProfanity": false,
    "cleanAutomatically": false,
    "maxLength": 1000
  }
}
```

## Error Handling

When content is rejected, users receive clear error messages:

### Comment/Message Rejection
```json
{
  "message": "Comment contains inappropriate content",
  "errors": ["Content contains inappropriate language"]
}
```

### Profile Update Rejection
```json
{
  "message": "Profile contains inappropriate content", 
  "errors": [
    "bio: Content contains inappropriate language",
    "displayName: Content must not exceed 50 characters"
  ]
}
```

### Clip/Screenshot Rejection
```json
{
  "message": "Clip content contains inappropriate language",
  "errors": [
    "Title: Content contains inappropriate language",
    "Description: Content must not exceed 500 characters"
  ]
}
```

## Technical Implementation

### ContentFilterService
Located in `server/services/content-filter.ts`

Key methods:
- `containsProfanity(content)` - Check if content has inappropriate language
- `cleanContent(content)` - Replace profanity with asterisks
- `validateContent(content, options)` - Comprehensive validation with options
- `addCustomWords(words)` - Add custom words to filter
- `removeWords(words)` - Remove words from filter
- `getProfaneWords(content)` - Get list of problematic words found

### Integration Points
The content filter is integrated into all user-generated content endpoints:
- Comment creation
- Message sending
- Profile updates
- Clip uploads
- Screenshot uploads

## Configuration

### Default Settings
- Profanity detection: **Enabled**
- Automatic cleaning: **Disabled** (content is rejected instead)
- Custom words: **Empty** (can be added via admin panel)

### Character Limits
- Comments: 1000 characters
- Messages: 2000 characters
- Bio: 500 characters
- Display Name: 50 characters
- Location: 100 characters
- Website URL: 200 characters
- Clip/Screenshot Title: 100 characters
- Clip/Screenshot Description: 500 characters

## Security Features

- **Admin-Only Management**: Only admin users can manage the word filter
- **Error Safety**: If the filter fails, content is allowed through to prevent breaking the app
- **Comprehensive Coverage**: All text input fields are protected
- **Flexible Configuration**: Admins can customize filtering behavior per content type

## Future Enhancements

Potential improvements that could be added:
1. **Severity Levels**: Different actions for mild vs severe content
2. **User Warnings**: Warning system before content rejection
3. **Appeal System**: Allow users to appeal false positives
4. **Language Detection**: Support for multiple languages
5. **Context Awareness**: Smart filtering based on content context
6. **Rate Limiting**: Prevent spam attempts with inappropriate content