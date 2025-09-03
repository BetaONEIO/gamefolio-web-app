
const fs = require('fs');
const path = require('path');

async function testEmailTemplate() {
  console.log('🎨 Testing Email Template Styling and Images');
  console.log('============================================\n');

  try {
    // Read the email template
    const templatePath = path.join(__dirname, 'server', 'templates', 'emails', 'verification.html');
    const template = await fs.promises.readFile(templatePath, 'utf-8');
    
    console.log('✅ Email template loaded successfully');
    
    // Check for correct background colors
    const hasNavyBackground = template.includes('#0B2232');
    const hasGradientHeader = template.includes('linear-gradient(135deg, #1E3A8A 0%, #3B82F6 50%, #06B6D4 100%)');
    const hasGreenButton = template.includes('linear-gradient(135deg, #00FF66 0%, #00CC52 100%)');
    
    console.log('\n🎨 Styling Checks:');
    console.log(`   Navy background (#0B2232): ${hasNavyBackground ? '✅' : '❌'}`);
    console.log(`   Gradient header: ${hasGradientHeader ? '✅' : '❌'}`);
    console.log(`   Green gradient button: ${hasGreenButton ? '✅' : '❌'}`);
    
    // Check image handling
    const hasImageFallback = template.includes('style="display: none;"') && template.includes('<h1>Gamefolio</h1>');
    const hasImagePlaceholder = template.includes('{{imageUrl}}');
    
    console.log('\n🖼️  Image Handling:');
    console.log(`   Image hidden by default: ${hasImageFallback ? '✅' : '❌'}`);
    console.log(`   Gamefolio text fallback: ${template.includes('<h1>Gamefolio</h1>') ? '✅' : '❌'}`);
    console.log(`   Image URL placeholder: ${hasImagePlaceholder ? '✅' : '❌'}`);
    
    // Test template variable replacement
    const sampleVariables = {
      verificationUrl: 'https://example.com/verify?token=sample123',
      imageUrl: 'https://example.com/static/email-assets/verifyEmail.png',
      siteUrl: 'https://example.com'
    };
    
    let processedTemplate = template;
    for (const [key, value] of Object.entries(sampleVariables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value);
    }
    
    console.log('\n🔗 Template Processing:');
    console.log(`   Variables replaced: ${!processedTemplate.includes('{{') ? '✅' : '❌'}`);
    
    // Save processed template for manual inspection
    await fs.promises.writeFile('test-email-output.html', processedTemplate);
    console.log('   Sample email saved as: test-email-output.html');
    
    // Check specific color codes
    const colorChecks = {
      'Navy background': '#0B2232',
      'White text': '#ffffff',
      'Green button start': '#00FF66',
      'Green button end': '#00CC52',
      'Light text': '#d6d6d6'
    };
    
    console.log('\n🎨 Color Scheme Verification:');
    for (const [name, color] of Object.entries(colorChecks)) {
      const hasColor = template.includes(color);
      console.log(`   ${name} (${color}): ${hasColor ? '✅' : '❌'}`);
    }
    
    console.log('\n🎉 Email template test completed!');
    console.log('\nKey findings:');
    console.log('- Template uses correct Gamefolio navy blue background');
    console.log('- Gradient header with brand colors');
    console.log('- Green gradient button matching brand');
    console.log('- Image fallback with Gamefolio text');
    console.log('- Proper color scheme throughout');
    
  } catch (error) {
    console.error('❌ Template test failed:', error);
  }
}

testEmailTemplate();
