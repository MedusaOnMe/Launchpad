import express from 'express';
import cors from 'cors';
import path from 'path';
import { launchpadService } from './raydium-launchpad';
import { TokenLaunchRequest } from './launchpad-types';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Raydium LaunchLab Backend',
    timestamp: new Date().toISOString()
  });
});

// Launch token endpoint
app.post('/api/launch', async (req, res) => {
  try {
    console.log('🚀 Token launch request received');
    console.log('Request body:', req.body);

    const launchRequest: TokenLaunchRequest = req.body;

    // Validate required fields
    if (!launchRequest.name || !launchRequest.symbol || !launchRequest.totalSupply) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, totalSupply'
      });
    }

    // Validate total supply
    if (launchRequest.totalSupply <= 0 || launchRequest.totalSupply > 1000000000000) {
      return res.status(400).json({
        success: false,
        error: 'Total supply must be between 1 and 1 trillion'
      });
    }

    // Launch the token
    const result = await launchpadService.launchToken(launchRequest);
    
    if (result.success) {
      console.log('✅ Token launch successful');
      res.json(result);
    } else {
      console.error('❌ Token launch failed:', result.error);
      res.status(500).json(result);
    }

  } catch (error: any) {
    console.error('❌ Launch endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get pool status endpoint
app.get('/api/status/:poolId', (req, res) => {
  try {
    const poolId = req.params.poolId;
    const status = launchpadService.getPoolStatus(poolId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error: any) {
    console.error('❌ Status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get all pools endpoint
app.get('/api/pools', (req, res) => {
  try {
    const pools = launchpadService.getAllPools();
    res.json({
      success: true,
      data: pools
    });

  } catch (error: any) {
    console.error('❌ Pools endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Basic HTML form for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Raydium LaunchLab - Token Creator</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }
            input, textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                box-sizing: border-box;
            }
            input:focus, textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                margin-top: 20px;
            }
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .result {
                margin-top: 20px;
                padding: 15px;
                border-radius: 8px;
                display: none;
            }
            .success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            .error {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            .note {
                background: #e7f3ff;
                border: 1px solid #b3d9ff;
                color: #004085;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Raydium LaunchLab Token Creator</h1>
            
            <div class="note">
                <strong>Authentic Raydium Integration:</strong> This creates real tokens with bonding curves on Solana mainnet. 
                When 69 SOL is raised, tokens automatically migrate to Raydium AMM for trading.
            </div>

            <form id="launchForm">
                <div class="form-group">
                    <label for="name">Token Name *</label>
                    <input type="text" id="name" name="name" required placeholder="e.g., My Amazing Token">
                </div>

                <div class="form-group">
                    <label for="symbol">Token Symbol *</label>
                    <input type="text" id="symbol" name="symbol" required placeholder="e.g., MAT" maxlength="10">
                </div>

                <div class="form-group">
                    <label for="totalSupply">Total Supply *</label>
                    <input type="number" id="totalSupply" name="totalSupply" required placeholder="1000000000" min="1" max="1000000000000">
                </div>

                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="3" placeholder="Describe your token..."></textarea>
                </div>

                <div class="form-group">
                    <label for="fundraisingGoal">Fundraising Goal (SOL)</label>
                    <input type="number" id="fundraisingGoal" name="fundraisingGoal" placeholder="69" min="1" max="1000" step="0.1">
                </div>

                <div class="form-group">
                    <label for="imageUrl">Image URL</label>
                    <input type="url" id="imageUrl" name="imageUrl" placeholder="https://example.com/image.png">
                </div>

                <div class="form-group">
                    <label for="website">Website</label>
                    <input type="url" id="website" name="website" placeholder="https://yourproject.com">
                </div>

                <div class="form-group">
                    <label for="twitter">Twitter</label>
                    <input type="text" id="twitter" name="twitter" placeholder="@yourproject">
                </div>

                <div class="form-group">
                    <label for="telegram">Telegram</label>
                    <input type="text" id="telegram" name="telegram" placeholder="@yourproject">
                </div>

                <button type="submit" id="submitBtn">🚀 Launch Token on Raydium</button>
            </form>

            <div id="result" class="result"></div>
        </div>

        <script>
            document.getElementById('launchForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = document.getElementById('submitBtn');
                const result = document.getElementById('result');
                
                submitBtn.disabled = true;
                submitBtn.textContent = '🚀 Launching...';
                result.style.display = 'none';

                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                // Convert numeric fields
                data.totalSupply = parseInt(data.totalSupply);
                if (data.fundraisingGoal) data.fundraisingGoal = parseFloat(data.fundraisingGoal);

                try {
                    const response = await fetch('/api/launch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    const resultData = await response.json();

                    if (resultData.success) {
                        result.className = 'result success';
                        result.innerHTML = \`
                            <h3>✅ Token Launched Successfully!</h3>
                            <p><strong>Pool ID:</strong> \${resultData.poolId}</p>
                            <p><strong>Token Mint:</strong> \${resultData.tokenMint}</p>
                            <p><strong>Transaction:</strong> <a href="https://solscan.io/tx/\${resultData.transactionId}" target="_blank">\${resultData.transactionId}</a></p>
                            <p>Your token is now live with a bonding curve! It will automatically migrate to Raydium AMM when the fundraising goal is reached.</p>
                        \`;
                    } else {
                        result.className = 'result error';
                        result.innerHTML = \`
                            <h3>❌ Launch Failed</h3>
                            <p>\${resultData.error}</p>
                        \`;
                    }

                } catch (error) {
                    result.className = 'result error';
                    result.innerHTML = \`
                        <h3>❌ Network Error</h3>
                        <p>\${error.message}</p>
                    \`;
                }

                result.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Launch Token on Raydium';
            });
        </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 RAYDIUM LAUNCHLAB BACKEND STARTED');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Test interface: http://localhost:${PORT}`);
  console.log(`🔧 Launch API: POST http://localhost:${PORT}/api/launch`);
  console.log(`📊 Status API: GET http://localhost:${PORT}/api/status/:poolId`);
});

export default app;