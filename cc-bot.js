const TELEGRAM_BOT_TOKEN = 'TOKEN_BOT'; // Ganti Dengan Bot Token Anda
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHECK_CC_API_URL = "https://api.chkr.cc/"; // Ganti Dengan Api Pribadi Yang Kalian Miliki jika Ada

// KONFIGURASI ADMIN
const ADMIN_USER_ID = 1234567890; // Ganti dengan User ID Telegram Anda (angka)
const ADMIN_USERNAME = "username"; // Username Telegram Anda

// Storage untuk generated cards yang belum divalidasi
let pendingValidation = new Map(); // userId -> {cards: [], bin: '', requestedAmount: number}

// Fungsi untuk cek apakah user adalah admin
function isAdmin(userId, username) {
  return userId === ADMIN_USER_ID || username === ADMIN_USERNAME;
}

function generateExpiry(customMonth = null, customYear = null) {
  let month, year;
  
  if (customMonth && customYear) {
    month = customMonth;
    year = customYear;
  } else if (customMonth) {
    month = customMonth;
    year = Math.floor(Math.random() * (2039 - 2025 + 1)) + 2025; // Year 2025-2039
  } else if (customYear) {
    month = Math.floor(Math.random() * 12) + 1; // Month 1-12
    year = customYear;
  } else {
    month = Math.floor(Math.random() * 12) + 1; // Month 1-12
    year = Math.floor(Math.random() * (2039 - 2025 + 1)) + 2025; // Year 2025-2039
  }
  
  return `${month.toString().padStart(2, '0')}|${year}`;
}

function generateCVV(customCVV = null) {
  if (customCVV) {
    return customCVV;
  }
  return Math.floor(Math.random() * 900 + 100).toString(); // 3-digit CVV
}

// FUNGSI BARU: Generate BIN yang 100% random
function generateRandomBIN() {
  // Daftar awalan BIN yang valid untuk kartu kredit
  const binPrefixes = [
    // Visa (dimulai dengan 4)
    '4', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
    
    // MasterCard (dimulai dengan 5)
    '51', '52', '53', '54', '55',
    
    // MasterCard (dimulai dengan 2)
    '22', '23', '24', '25', '26', '27',
    
    // American Express (dimulai dengan 34 atau 37)
    '34', '37',
    
    // Discover (dimulai dengan 6)
    '60', '62', '64', '65',
    
    // JCB (dimulai dengan 35)
    '35',
    
    // Diners Club (dimulai dengan 30)
    '30',
    
    // UnionPay (dimulai dengan 62)
    '62', '624', '625', '626'
  ];
  
  // Pilih prefix secara random
  const randomPrefix = binPrefixes[Math.floor(Math.random() * binPrefixes.length)];
  
  // Generate sisa digit untuk membuat BIN 6 digit
  let bin = randomPrefix;
  while (bin.length < 6) {
    bin += Math.floor(Math.random() * 10).toString();
  }
  
  return bin;
}

// Fungsi untuk validasi BIN dengan 6-12 digit
function isValidBIN(bin) {
  return /^\d{6,12}$/.test(bin);
}

// Fungsi untuk validasi month (1-12)
function isValidMonth(month) {
  const m = parseInt(month);
  return m >= 1 && m <= 12;
}

// Fungsi untuk validasi year (2025-2039)
function isValidYear(year) {
  const y = parseInt(year);
  return y >= 2025 && y <= 2039;
}

// Fungsi untuk validasi CVV (3-4 digit)
function isValidCVV(cvv) {
  return /^\d{3,4}$/.test(cvv);
}

function luhnCheck(num) {
  const arr = num.toString()
    .split('')
    .reverse()
    .map(Number);

  const sum = arr.reduce((acc, digit, idx) => {
    if (idx % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    return acc + digit;
  }, 0);

  return sum % 10 === 0;
}

function generateCardNumber(binCode) {
  const cardNumber = binCode.split('').map(Number);
  
  // Tentukan panjang total kartu berdasarkan BIN
  let targetLength = 16; // Default untuk Visa/MasterCard
  
  // Jika BIN dimulai dengan 3 (Amex), panjang 15
  if (binCode.startsWith('3')) {
    targetLength = 15;
  }
  // Jika BIN dimulai dengan 62 (UnionPay), bisa 16-19
  else if (binCode.startsWith('62')) {
    targetLength = Math.random() > 0.5 ? 16 : 19;
  }

  // Add random digits sampai mencapai panjang target - 1 (untuk checksum)
  while (cardNumber.length < targetLength - 1) {
    cardNumber.push(Math.floor(Math.random() * 10));
  }

  // Find valid checksum digit
  for (let i = 0; i <= 9; i++) {
    if (luhnCheck(cardNumber.join('') + i)) {
      cardNumber.push(i);
      break;
    }
  }

  return cardNumber.join('');
}

// Fungsi untuk mengecek apakah CC valid menggunakan API
async function checkCreditCard(cardData) {
  try {
    const payload = {
      data: cardData,
      charge: false
    };

    const response = await fetch(CHECK_CC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error('Error checking credit card:', error);
    return null;
  }
}

// Fungsi baru untuk mengecek multiple CC sekaligus
async function checkMultipleCreditCards(cardDataArray) {
  const results = [];
  
  for (let i = 0; i < cardDataArray.length; i++) {
    const cardData = cardDataArray[i];
    
    try {
      const result = await checkCreditCard(cardData);
      
      if (!result) {
        results.push({
          cardData,
          status: "❌ Check failed",
          details: null
        });
      } else {
        const { code, status, message, card } = result;
        
        let statusEmoji = "❓";
        let statusText = status;
        
        if (code === 0) {
          statusEmoji = "❌";
          statusText = "Invalid";
        } else if (code === 1) {
          statusEmoji = "✅";
          statusText = "Valid";
        } else if (code === 2 || status.toLowerCase().includes('unknown')) {
          statusEmoji = "❔";
          statusText = "Unknown";
        }

        results.push({
          cardData,
          status: `${statusEmoji} ${statusText}`,
          details: card
        });
      }
      
      // Delay kecil untuk menghindari rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error('Error checking card:', error);
      results.push({
        cardData,
        status: "❌ Error occurred",
        details: null
      });
    }
  }
  
  return results;
}

// Fungsi untuk format hasil multiple check
function formatMultipleCheckResponse(results) {
  let response = `🔍 *Multiple CC Check Results*\n`;
  response += `Total: ${results.length} cards\n\n`;
  
  results.forEach((result, index) => {
    response += `${index + 1}. ${result.status}\n`;
    response += `   ${result.cardData}\n`;
    
    if (result.details) {
      response += `   Bank: ${result.details.bank || 'N/A'}\n`;
      response += `   Brand: ${result.details.brand || 'N/A'}\n`;
      if (result.details.country) {
        response += `   Country: ${result.details.country.name || 'N/A'} ${result.details.country.emoji || ''}\n`;
      }
    }
    response += '\n';
  });
  
  response += `_${new Date().toLocaleString()}_`;
  
  return response;
}

// Fungsi untuk generate CC dengan custom expiry dan CVV
async function generateCards(binCode, count, customMonth = null, customYear = null, customCVV = null) {
  const cards = [];
  
  for (let i = 0; i < count; i++) {
    const cardNumber = generateCardNumber(binCode);
    const expiry = generateExpiry(customMonth, customYear);
    const cvv = generateCVV(customCVV);
    const cardData = `${cardNumber}|${expiry}|${cvv}`;
    cards.push(cardData);
  }

  return cards;
}

function formatGeneratedCardsMessage(cards, bin, requestedAmount, customSettings = null) {
  let message = `🎯 *CC Generated Successfully*\n` +
    `BIN: ${bin || 'Random'} | Generated: ${cards.length}/${requestedAmount}\n`;
  
  if (customSettings) {
    message += `Settings: ${customSettings}\n`;
  }
  
  message += `\n${cards.join('\n')}\n\n` +
    `_Generated at: ${new Date().toLocaleString()}_`;
  
  return message;
}

// Hasil yang lebih simple untuk check manual
function formatCreditCardResponse(result) {
  if (!result) {
    return "❌ Check failed";
  }

  const { code, status, message, card } = result;
  
  let statusEmoji = "❓";
  let statusText = status;
  
  if (code === 0) {
    statusEmoji = "❌";
    statusText = "Invalid";
  } else if (code === 1) {
    statusEmoji = "✅";
    statusText = "Valid";
  } else if (code === 2 || status.toLowerCase().includes('unknown')) {
    statusEmoji = "❔";
    statusText = "Unknown";
  }

  let response = `${statusEmoji} *${statusText}*\n`;
  
  if (card) {
    response += `Card: ${card.card || 'N/A'}\n`;
    response += `Bank: ${card.bank || 'N/A'}\n`;
    response += `Type: ${card.type || 'N/A'}\n`;
    response += `Brand: ${card.brand || 'N/A'}\n`;
    
    if (card.country) {
      response += `Country: ${card.country.name || 'N/A'} ${card.country.emoji || ''}\n`;
    }
  }
  
  response += `\n_${new Date().toLocaleString()}_`;
  
  return response;
}

// Fungsi untuk membuat inline keyboard dengan tombol copy
function createInlineKeyboard(buttons) {
  return {
    inline_keyboard: buttons
  };
}

async function sendMessage(chatId, message) {
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  const payload = {
    chat_id: chatId,
    ...message
  };

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function handleRequest(request) {
  try {
    const { pathname } = new URL(request.url);

    if (pathname !== '/webhook') {
      return new Response('Not Found', { status: 404 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const update = await request.json();

    // Handle callback queries (inline keyboard button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const username = callbackQuery.from.username || '';
      const data = callbackQuery.data;

      // Cek apakah user adalah admin
      if (!isAdmin(userId, username)) {
        return new Response('OK', { status: 200 });
      }

      // Handle validation callbacks
      if (data === 'validate_generated') {
        const pending = pendingValidation.get(userId);
        if (pending) {
          // Kirim pesan loading
          await sendMessage(chatId, {
            text: `⏳ Validating ${pending.cards.length} generated cards...\nThis may take a moment.`,
            parse_mode: 'Markdown'
          });

          try {
            const results = await checkMultipleCreditCards(pending.cards);
            
            // Format hasil validasi
            let validationResult = `✅ *Validation Results*\n`;
            validationResult += `BIN: ${pending.bin} | Cards: ${pending.cards.length}\n\n`;
            
            const validCards = [];
            const unknownCards = [];
            const invalidCards = [];
            
            results.forEach((result, index) => {
              if (result.status.includes('✅')) {
                validCards.push(`✅ ${result.cardData}`);
              } else if (result.status.includes('❔')) {
                unknownCards.push(`❔ ${result.cardData}`);
              } else {
                invalidCards.push(`❌ ${result.cardData}`);
              }
            });
            
            if (validCards.length > 0) {
              validationResult += `*Valid Cards (${validCards.length}):*\n${validCards.join('\n')}\n\n`;
            }
            if (unknownCards.length > 0) {
              validationResult += `*Unknown Cards (${unknownCards.length}):*\n${unknownCards.join('\n')}\n\n`;
            }
            if (invalidCards.length > 0) {
              validationResult += `*Invalid Cards (${invalidCards.length}):*\n${invalidCards.join('\n')}\n\n`;
            }
            
            validationResult += `_Validated at: ${new Date().toLocaleString()}_`;
            
            await sendMessage(chatId, {
              text: validationResult,
              parse_mode: 'Markdown'
            });
            
            // Clear pending validation
            pendingValidation.delete(userId);
            
          } catch (error) {
            console.error('Validation error:', error);
            await sendMessage(chatId, {
              text: '❌ Error occurred during validation.',
              parse_mode: 'Markdown'
            });
          }
        } else {
          await sendMessage(chatId, {
            text: '❌ No pending cards to validate. Generate some cards first.',
            parse_mode: 'Markdown'
          });
        }
      } else if (data === 'skip_validation') {
        const pending = pendingValidation.get(userId);
        if (pending) {
          await sendMessage(chatId, {
            text: '✅ *Cards saved without validation*\n\nYou can use `/checkall` to validate them later if needed.',
            parse_mode: 'Markdown'
          });
          pendingValidation.delete(userId);
        }
      }

      // Answer callback query
      await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: data.startsWith('copy_') ? "Copied to clipboard! ✅" : "Processing..."
        }),
      });

      return new Response('OK', { status: 200 });
    }

    if (update.message) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const username = update.message.from.username || '';
      const firstName = update.message.from.first_name || '';
      const messageText = update.message.text;

      let responseMessage = { text: 'Unknown command', parse_mode: 'Markdown' };

      // Cek apakah user adalah admin
      if (!isAdmin(userId, username)) {
        // Tidak ada balasan untuk non-admin
        return new Response('OK', { status: 200 });
      }

      // Handler untuk /start dan /menu
      if (messageText === '/start' || messageText === '/menu') {
        let menuText = `🎉 *Welcome ${firstName}!*\n\n`;
        
        menuText += '🎯 *Generate Cards (Max 10):*\n' +
                   '• `/generate 5` - 100% Random BIN\n' +
                   '• `/generate 519505 3` - Specific BIN (6-12 digits)\n' +
                   '• `/generate 519505 3 12 2025` - Custom Month & Year\n' +
                   '• `/generate 519505 3 12 2025 123` - Custom Month, Year & CVV\n' +
                   '• `/generate 519505 3 * * 123` - Custom CVV only (use * for random)\n' +
                   '• Cards generated without auto-validation\n' +
                   '• You choose to validate or not\n\n' +
                   '🔍 *Check Single Card:*\n' +
                   '• `/check 1234567890123456|12|2025|123`\n\n' +
                   '🔍 *Check Multiple Cards (Max 10):*\n' +
                   '• `/checkall` - Check multiple cards\n\n' +
                   '📖 *Quick Guide for Multiple Check:*\n' +
                   '1. Type `/checkall` and press Enter\n' +
                   '2. Type each card in new line:\n' +
                   '   `4532123456781234|12|2025|123`\n' +
                   '   `5555444433331111|01|2026|456`\n' +
                   '3. Send the message\n\n' +
                   '💡 *Tips:*\n' +
                   '• Format: `card|month|year|cvv`\n' +
                   '• Maximum 10 cards per check\n' +
                   '• Each card must be on separate line\n' +
                   '• Month: 01-12, Year: 2025-2039\n' +
                   '• CVV: 3-4 digits\n' +
                   '• Use * for random values\n\n' +
                   '⚠️ *Note:* Generated cards are not auto-validated';

        responseMessage = {
          text: menuText,
          parse_mode: 'Markdown'
        };
      }
      // Command: Get my ID
      else if (messageText === '/myid') {
        responseMessage = {
          text: `🆔 *Your Information*\n\n` +
                `Name: ${firstName}\n` +
                `User ID: \`${userId}\`\n` +
                `Username: @${username || 'N/A'}\n` +
                `Admin: ✅\n\n` +
                `_Click button below to copy your User ID_`,
          parse_mode: 'Markdown',
          reply_markup: createInlineKeyboard([
            [{ text: "📋 Copy User ID", callback_data: `copy_${userId}` }]
          ])
        };
      }
      // Handler untuk generate dengan fitur custom expiry dan CVV
      else if (messageText.startsWith('/generate')) {
        const parts = messageText.split(' ').filter(p => p.trim() !== '');
        let binCode, count, customMonth = null, customYear = null, customCVV = null;
        let customSettings = '';

        // Parse command berdasarkan jumlah parameter
        if (parts.length === 2 && !isNaN(parts[1])) {
          // /generate [jumlah] (100% random BIN)
          binCode = generateRandomBIN();
          count = Math.min(parseInt(parts[1]), 10);
        }
        else if (parts.length === 3 && !isNaN(parts[2])) {
          // /generate [BIN] [jumlah]
          binCode = parts[1];
          if (!isValidBIN(binCode)) {
            responseMessage = {
              text: '❌ BIN must be 6-12 digits\n\nExamples:',
              parse_mode: 'Markdown',
              reply_markup: createInlineKeyboard([
                [{ text: "📋 Basic Example", callback_data: "copy_/generate 519505 5" }],
                [{ text: "📋 Custom Month/Year", callback_data: "copy_/generate 519505 3 12 2025" }],
                [{ text: "📋 Custom CVV", callback_data: "copy_/generate 519505 3 * * 123" }]
              ])
            };
            await sendMessage(chatId, responseMessage);
            return new Response('OK', { status: 200 });
          }
          count = Math.min(parseInt(parts[2]), 10);
        }
        else if (parts.length === 5) {
          // /generate [BIN] [jumlah] [month] [year]
          binCode = parts[1];
          if (!isValidBIN(binCode)) {
            responseMessage = {
              text: '❌ BIN must be 6-12 digits',
              parse_mode: 'Markdown'
            };
            await sendMessage(chatId, responseMessage);
            return new Response('OK', { status: 200 });
          }
          count = Math.min(parseInt(parts[2]), 10);
          
          // Validasi month
          if (parts[3] !== '*') {
            if (!isValidMonth(parts[3])) {
              responseMessage = {
                text: '❌ Month must be 01-12 or use * for random',
                parse_mode: 'Markdown'
              };
              await sendMessage(chatId, responseMessage);
              return new Response('OK', { status: 200 });
            }
            customMonth = parseInt(parts[3]);
            customSettings += `Month: ${customMonth.toString().padStart(2, '0')} `;
          } else {
            customSettings += 'Month: Random ';
          }
          
          // Validasi year
          if (parts[4] !== '*') {
            if (!isValidYear(parts[4])) {
              responseMessage = {
                text: '❌ Year must be 2025-2039 or use * for random',
                parse_mode: 'Markdown'
              };
              await sendMessage(chatId, responseMessage);
              return new Response('OK', { status: 200 });
            }
            customYear = parseInt(parts[4]);
            customSettings += `Year: ${customYear} `;
          } else {
            customSettings += 'Year: Random ';
          }
        }
        else if (parts.length === 6) {
          // /generate [BIN] [jumlah] [month] [year] [cvv]
          binCode = parts[1];
          if (!isValidBIN(binCode)) {
            responseMessage = {
              text: '❌ BIN must be 6-12 digits',
              parse_mode: 'Markdown'
            };
            await sendMessage(chatId, responseMessage);
            return new Response('OK', { status: 200 });
          }
          count = Math.min(parseInt(parts[2]), 10);
          
          // Validasi month
          if (parts[3] !== '*') {
            if (!isValidMonth(parts[3])) {
              responseMessage = {
                text: '❌ Month must be 01-12 or use * for random',
                parse_mode: 'Markdown'
              };
              await sendMessage(chatId, responseMessage);
              return new Response('OK', { status: 200 });
            }
            customMonth = parseInt(parts[3]);
            customSettings += `Month: ${customMonth.toString().padStart(2, '0')} `;
          } else {
            customSettings += 'Month: Random ';
          }
          
          // Validasi year
          if (parts[4] !== '*') {
            if (!isValidYear(parts[4])) {
              responseMessage = {
                text: '❌ Year must be 2025-2039 or use * for random',
                parse_mode: 'Markdown'
              };
              await sendMessage(chatId, responseMessage);
              return new Response('OK', { status: 200 });
            }
            customYear = parseInt(parts[4]);
            customSettings += `Year: ${customYear} `;
          } else {
            customSettings += 'Year: Random ';
          }
          
          // Validasi CVV
          if (parts[5] !== '*') {
            if (!isValidCVV(parts[5])) {
              responseMessage = {
                text: '❌ CVV must be 3-4 digits or use * for random',
                parse_mode: 'Markdown'
              };
              await sendMessage(chatId, responseMessage);
              return new Response('OK', { status: 200 });
            }
            customCVV = parts[5];
            customSettings += `CVV: ${customCVV}`;
          } else {
            customSettings += 'CVV: Random';
          }
        }
        else {
          responseMessage = {
            text: '❌ Wrong format!\n\n*Usage Examples:*',
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([
              [{ text: "📋 Random BIN", callback_data: "copy_/generate 5" }],
              [{ text: "📋 Specific BIN", callback_data: "copy_/generate 519505 5" }],
              [{ text: "📋 Custom Month/Year", callback_data: "copy_/generate 519505 3 12 2025" }],
              [{ text: "📋 Full Custom", callback_data: "copy_/generate 519505 3 12 2025 123" }],
              [{ text: "📋 Custom CVV Only", callback_data: "copy_/generate 519505 3 * * 123" }]
            ])
          };
          await sendMessage(chatId, responseMessage);
          return new Response('OK', { status: 200 });
        }

        // Kirim pesan "sedang generate"
        await sendMessage(chatId, {
          text: `⏳ Generating ${count} cards with BIN ${binCode}...\n${customSettings ? `Settings: ${customSettings}\n` : ''}Please wait...`,
          parse_mode: 'Markdown'
        });

        try {
          const cards = await generateCards(binCode, count, customMonth, customYear, customCVV);
          
          // Store generated cards for potential validation
          pendingValidation.set(userId, {
            cards: cards,
            bin: binCode,
            requestedAmount: count
          });
          
          responseMessage = {
            text: formatGeneratedCardsMessage(cards, binCode, count, customSettings),
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([
              [
                { text: "✅ Validate Cards", callback_data: "validate_generated" },
                { text: "⏭️ Skip Validation", callback_data: "skip_validation" }
              ]
            ])
          };
        } catch (error) {
          console.error('Generate error:', error);
          responseMessage = {
            text: '❌ Error occurred while generating cards.',
            parse_mode: 'Markdown'
          };
        }
      }
      // Handler untuk check CC tunggal
      else if (messageText.startsWith('/check ')) {
        const cardData = messageText.substring(7).trim();
        
        if (!cardData.includes('|') || cardData.split('|').length < 3) {
          responseMessage = {
            text: '❌ Wrong format!\n\nExample:',
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([
              [{ text: "📋 Copy Example", callback_data: "copy_/check 1234567890123456|12|2025|123" }]
            ])
          };
        } else {
          // Kirim pesan "sedang memeriksa"
          await sendMessage(chatId, {
            text: '⏳ Checking...',
            parse_mode: 'Markdown'
          });

          try {
            const result = await checkCreditCard(cardData);
            
            if (!result) {
              responseMessage = {
                text: '❌ Check failed. API unavailable.',
                parse_mode: 'Markdown'
              };
            } else {
              responseMessage = {
                text: formatCreditCardResponse(result),
                parse_mode: 'Markdown'
              };
            }
          } catch (error) {
            console.error('Check error:', error);
            responseMessage = {
              text: '❌ Error occurred while checking card.',
              parse_mode: 'Markdown'
            };
          }
        }
      }
      // Handler baru untuk check multiple CC
      else if (messageText.startsWith('/checkall')) {
        const lines = messageText.split('\n');
        const cardDataArray = [];
        
        // Ambil semua line kecuali line pertama (/checkall)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && line.includes('|') && line.split('|').length >= 3) {
            cardDataArray.push(line);
          }
        }
        
        if (cardDataArray.length === 0) {
          const exampleText = `/checkall\n4532123456781234|12|2025|123\n5555444433331111|01|2026|456`;
          
          responseMessage = {
            text: '❌ No valid card data found!\n\n' +
                  '📖 *How to use /checkall:*\n\n' +
                  '1️⃣ Type `/checkall` and press Enter\n' +
                  '2️⃣ On next line, enter first card:\n' +
                  '   `4532123456781234|12|2025|123`\n' +
                  '3️⃣ On next line, enter second card:\n' +
                  '   `5555444433331111|01|2026|456`\n' +
                  '4️⃣ Continue for up to 10 cards\n' +
                  '5️⃣ Send the message\n\n' +
                  '💡 *Tips:*\n' +
                  '• Format: `card|month|year|cvv`\n' +
                  '• Each card on separate line\n' +
                  '• Maximum 10 cards per check\n' +
                  '• Month: 01-12, Year: 2025-2039',
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard([
              [{ text: "📋 Copy Example", callback_data: `copy_${exampleText}` }]
            ])
          };
        } else if (cardDataArray.length > 10) {
          responseMessage = {
            text: '❌ Too many cards! Maximum 10 cards per check.\n\nPlease reduce the number of cards and try again.',
            parse_mode: 'Markdown'
          };
        } else {
          // Kirim pesan "sedang memeriksa"
          await sendMessage(chatId, {
            text: `⏳ Checking ${cardDataArray.length} cards...\nThis may take a moment.`,
            parse_mode: 'Markdown'
          });

          try {
            const results = await checkMultipleCreditCards(cardDataArray);
            
            responseMessage = {
              text: formatMultipleCheckResponse(results),
              parse_mode: 'Markdown'
            };
          } catch (error) {
            console.error('Multiple check error:', error);
            responseMessage = {
              text: '❌ Error occurred while checking cards.',
              parse_mode: 'Markdown'
            };
          }
        }
      }

      // Kirim pesan balasan
      await sendMessage(chatId, responseMessage);
      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
