<p align="center">
  <img src="./img.png" alt="Project Banner" width="100%">
</p>

# [Stock simulator] 🎯

## Basic Details

### Team Name: [Void main]

### Team Members
- Member 1: [Akshara K] - [Government Engineering College, Thrissur]
- Member 2: [Parvathy.P] - [Government Engineering College,Thrissur]

### Hosted Project Link
[https://stock-simulator-ggup.onrender.com/]

### Project Description
[It is a gamified stock trading simulator that lets users practice investing with virtual money. Users can trade real stocks using live data, track their portfolios, and compete on a leaderboard. The platform combines hands-on learning, analytics, and gamification to teach financial literacy safely and interactively.]

### The Problem statement
[Many students and beginner investors are interested in learning how the stock market works, but they lack practical experience due to financial risk, fear of losses, and limited access to guided simulation platforms. Traditional learning methods (theory-based courses or static examples) fail to provide real-world exposure to market fluctuations and decision-making under uncertainty.]

### The Solution
[Build a web-based stock market simulator where users get virtual cash to buy and sell real stocks using live market data. The platform tracks portfolios in real time, displays a leaderboard to gamify learning, and provides charts and insights to help users understand market dynamics—all without financial risk]

---

## Technical Details

### Technologies/Components Used

**For Software:**
- Languages used: [ Vanilla JavaScript, HTML5, CSS3]
- Frameworks used: [Express.js]
- Libraries used: [axios,cors,bycryptjs,winston,jsonwebtoken,express-validator]
- Tools used: [ VS Code, Git, Render]


## Features

List the key features of your project:
- Virtual Trading System: [Buy/sell stocks with virtual currency ($100,000 starting balance);  Real-time portfolio tracking with market value, P&L, and profit percentage;  Transaction history with buy/sell details, prices, and timestamps & Support for multiple stock symbols (AAPL, GOOGL, MSFT, TSLA, etc.]
- Dual price mode : [Live Yahoo Finance Data: Fetch real stock prices with NSE/BSE support (e.g., .NS, .BO suffixes); Simulated Mode: GBM-based random daily candles with realistic volatility, gap jumps, and volume;  Runtime toggle via /api/admin/random-prices endpoint for seamless switching]
- Competitive leader board: [Real-time ranking of users by total portfolio value;  Shows rank, portfolio value, cash, market value, and P&L per user;  Encourages competitive learning and performance tracking;  Automatically calculated based on current market prices]
- Secure Authentication & User Management: [JWT-based token authentication with 7-day expiration;  bcrypt password hashing (10 rounds) for secure credential storage;  Email validation and username uniqueness checks;  Persistent user sessions via localStorage;  Protected API routes with middleware-level authorization;  Isolated user data (holdings, cash, transactions) per account]

---

## Implementation

### For Software:

#### Installation
```bash
[Installation commands - npm install]
```

#### Run
```bash
[Run commands - npm start, node server.js]
```


---

## Project Documentation

### For Software:

#### Screenshots (Add at least 3)

![Screenshot1]
<img width="1900" height="946" alt="image" src="https://github.com/user-attachments/assets/fa82faec-5d0b-4197-aa83-4294f3fb7b79" />

*This is the user login/ registration page.*

![Screenshot2]
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/24f65330-00cd-45de-b3dc-4a5f2e21bf8e" />
*This is the page after signing in. It displays user name, portfolio, holdings etc and trading options*


![Screenshot3]
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/628a1966-58a8-4b22-9cd0-c71525f0b1f7" />

*this shows the leaderboard and the candlebar chart of the portfolio*

#### Diagrams

**System Architecture:**

![Architecture Diagram](docs/architecture.png)
![WhatsApp Image 2026-02-14 at 10 45 48 AM](https://github.com/user-attachments/assets/c6cea5f4-265b-4a30-80bf-4e779237a429)

FRONTEND (HTML/CSS/Vanilla JS)
    ↓ HTTP + JWT
BACKEND (Express.js)
    ├─ Auth: bcryptjs + jsonwebtoken
    ├─ API Routes: Trading, portfolio, charts, leaderboard
    ├─ Price Engine: Yahoo API or GBM simulation
    └─ Business Logic: Portfolio calc, P&L, candles
    ↓ File I/O
DATA (data.json)
    ├─ Users (accounts, holdings, transactions)
    └─ Price History (time-series data)
**Application Workflow:**

![Workflow](docs/workflow.png)
*1.Registration → User creates account (username, email, password)
2.Login → Credentials verified, JWT token issued → stored in browser
3.Dashboard → View $100k starting balance, cash, portfolio value, P&L4. 4.Trading →Enter symbol + quantity
Click Buy/Sell
Price fetched → Holdings updated → Cash adjusted
5.Charts → Click symbol → Fetch OHLC candles → Render 
6.Leaderboard → View top 10 users ranked by portfolio value
7.Logout → Clear JWT token → End session*

---



#### Build Photos

![Team](Add photo of your team here)

![Components](Add photo of your components here)
*List out all components shown*

![Build](Add photos of build process here)
*Explain the build steps*

![Final](Add photo of final product here)
*Explain the final build*

---

## Additional Documentation

### For Web Projects with Backend:

#### API Documentation

**Base URL:** `https://api.yourproject.com`

##### Endpoints

**GET /api/endpoint**
- **Description:** [What it does]
- **Parameters:**
  - `param1` (string): [Description]
  - `param2` (integer): [Description]
- **Response:**
```json
{
  "status": "success",
  "data": {}
}
```

**POST /api/endpoint**
- **Description:** [What it does]
- **Request Body:**
```json
{
  "field1": "value1",
  "field2": "value2"
}
```
- **Response:**
```json
{
  "status": "success",
  "message": "Operation completed"
}
```

[Add more endpoints as needed...]

---

### For Mobile Apps:

#### App Flow Diagram

![App Flow](docs/app-flow.png)
*Explain the user flow through your application*

#### Installation Guide

**For Android (APK):**
1. Download the APK from [Release Link]
2. Enable "Install from Unknown Sources" in your device settings:
   - Go to Settings > Security
   - Enable "Unknown Sources"
3. Open the downloaded APK file
4. Follow the installation prompts
5. Open the app and enjoy!

**For iOS (IPA) - TestFlight:**
1. Download TestFlight from the App Store
2. Open this TestFlight link: [Your TestFlight Link]
3. Click "Install" or "Accept"
4. Wait for the app to install
5. Open the app from your home screen

**Building from Source:**
```bash
# For Android
flutter build apk
# or
./gradlew assembleDebug

# For iOS
flutter build ios
# or
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug
```

---



### For Scripts/CLI Tools:

#### Command Reference

**Basic Usage:**
```bash
python script.py [options] [arguments]
```

**Available Commands:**
- `command1 [args]` - Description of what command1 does
- `command2 [args]` - Description of what command2 does
- `command3 [args]` - Description of what command3 does

**Options:**
- `-h, --help` - Show help message and exit
- `-v, --verbose` - Enable verbose output
- `-o, --output FILE` - Specify output file path
- `-c, --config FILE` - Specify configuration file
- `--version` - Show version information

**Examples:**

```bash
# Example 1: Basic usage
python script.py input.txt

# Example 2: With verbose output
python script.py -v input.txt

# Example 3: Specify output file
python script.py -o output.txt input.txt

# Example 4: Using configuration
python script.py -c config.json --verbose input.txt
```

#### Demo Output

**Example 1: Basic Processing**

**Input:**
```
This is a sample input file
with multiple lines of text
for demonstration purposes
```

**Command:**
```bash
python script.py sample.txt
```

**Output:**
```
Processing: sample.txt
Lines processed: 3
Characters counted: 86
Status: Success
Output saved to: output.txt
```

**Example 2: Advanced Usage**

**Input:**
```json
{
  "name": "test",
  "value": 123
}
```

**Command:**
```bash
python script.py -v --format json data.json
```

**Output:**
```
[VERBOSE] Loading configuration...
[VERBOSE] Parsing JSON input...
[VERBOSE] Processing data...
{
  "status": "success",
  "processed": true,
  "result": {
    "name": "test",
    "value": 123,
    "timestamp": "2024-02-07T10:30:00"
  }
}
[VERBOSE] Operation completed in 0.23s
```

---

## Project Demo

### Video
[Add your demo video link here - YouTube, Google Drive, etc.]

*Explain what the video demonstrates - key features, user flow, technical highlights*

### Additional Demos
[Add any extra demo materials/links - Live site, APK download, online demo, etc.]

---

## AI Tools Used (Optional - For Transparency Bonus)

If you used AI tools during development, document them here for transparency:

**Tool Used:** [ vs code Copilot, Gemini, ChatGPT]

**Purpose:** [What you used it for]
-  "Debugging assistance"
-  "Code review and optimization suggestions"
-  

**Key Prompts Used:**
- "Create a REST API endpoint for user authentication"
- "Debug this async function that's causing race conditions"
- "Optimize this database query for better performance"

**Percentage of AI-generated code:** [Approximately X%]

**Human Contributions:**
- Architecture design and planning
- Custom business logic implementation
- Integration and testing
- UI/UX design decisions

*Note: Proper documentation of AI usage demonstrates transparency and earns bonus points in evaluation!*

---

## Team Contributions

- [Name 1]: [Specific contributions - e.g., Frontend development, API integration, etc.]
- [Name 2]: [Specific contributions - e.g., Backend development, Database design, etc.]
- [Name 3]: [Specific contributions - e.g., UI/UX design, Testing, Documentation, etc.]

---

## License

This project is licensed under the [LICENSE_NAME] License - see the [LICENSE](LICENSE) file for details.

**Common License Options:**
- MIT License (Permissive, widely used)
- Apache 2.0 (Permissive with patent grant)
- GPL v3 (Copyleft, requires derivative works to be open source)

---

Made with ❤️ at TinkerHub
