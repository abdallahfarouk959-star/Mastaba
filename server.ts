import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data folder exists
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"));
}

// Ensure db.json exists
if (!fs.existsSync(DB_PATH)) {
  const initialDb = {
    users: [],
    gameweeks: [],
    predictions: []
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), "utf-8");
}

// Read database helper
function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading DB:", error);
    return { users: [], gameweeks: [], predictions: [] };
  }
}

// Write database helper
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing DB:", error);
  }
}

// Lazy initialization of Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not configured or has default value. AI features will operate in high-quality simulation mode.");
    return null;
  }
  try {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return aiClient;
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI client:", e);
    return null;
  }
}

// --- points calculation algorithm (Points Engine) ---
// Exact score = 5 points
// Correct winner + correct goal difference or margin = 3 points
// Correct winner only = 2 points
// Wrong = 0 points
function calculatePoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
  if (predHome === actualHome && predAway === actualAway) {
    return 5; // Exact Score
  }

  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;

  // Check if both predicted and actual have the same winner or both are draw
  const predWinner = predDiff > 0 ? 1 : predDiff < 0 ? -1 : 0;
  const actualWinner = actualDiff > 0 ? 1 : actualDiff < 0 ? -1 : 0;

  if (predWinner === actualWinner) {
    if (predDiff === actualDiff) {
      return 3; // Correct margin/GD
    }
    return 2; // Correct outcome only
  }

  return 0; // Completely wrong
}

// Automatically generate predictions for YouTubers based on their football opinions!
function generateYouTuberPredictions(match: any, userId: string) {
  // Simple heuristic based on YouTubers' styles
  let predHome = 1;
  let predAway = 1;

  const hName = match.homeTeam;
  const aName = match.awayTeam;

  if (userId === "mamdouh") {
    // Mamdouh: Loves Arsenal, highly dramatic, lots of goals
    if (hName.includes("آرسنال") || hName.toLowerCase().includes("arsenal")) {
      predHome = 3; predAway = 1;
    } else if (aName.includes("آرسنال") || aName.toLowerCase().includes("arsenal")) {
      predHome = 1; predAway = 3;
    } else {
      // General high-scoring predictions
      predHome = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
      predAway = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
    }
  } else if (userId === "mosaab") {
    // Mosaab: tactical, low scoring, realistic
    if (hName.includes("ميلان") || hName.toLowerCase().includes("milan")) {
      predHome = 1; predAway = 0;
    } else if (aName.includes("ميلان") || aName.toLowerCase().includes("milan")) {
      predHome = 0; predAway = 1;
    } else {
      predHome = Math.random() > 0.5 ? 2 : 1;
      predAway = Math.random() > 0.5 ? 1 : 0;
    }
  } else if (userId === "alkhafif") {
    // Al-Khafif: loves jokes, predicts funny failures or unexpected upsets
    if (hName.includes("مانشستر يونايتد") || hName.toLowerCase().includes("united")) {
      predHome = 0; predAway = 3; // trolling United
    } else if (aName.includes("مانشستر يونايتد") || aName.toLowerCase().includes("united")) {
      predHome = 3; predAway = 0;
    } else {
      predHome = Math.floor(Math.random() * 4); // chaotic
      predAway = Math.floor(Math.random() * 4);
    }
  } else if (userId === "marwan") {
    // Marwan: Barca fan, passionate about Spanish teams
    if (hName.includes("برشلونة") || hName.toLowerCase().includes("barcelona")) {
      predHome = 3; predAway = 1;
    } else if (aName.includes("برشلونة") || aName.toLowerCase().includes("barcelona")) {
      predHome = 1; predAway = 3;
    } else {
      predHome = Math.floor(Math.random() * 3) + 1;
      predAway = Math.floor(Math.random() * 3) + 1;
    }
  }

  return { predHome, predAway };
}

// 1. GET FULL DB
app.get("/api/db", (req, res) => {
  res.json(readDb());
});

// 2. SUBMIT USER PREDICTIONS
app.post("/api/predictions", (req, res) => {
  const { userId, predictions } = req.body;
  if (!userId || !Array.isArray(predictions)) {
    return res.status(400).json({ error: "بيانات الإدخال غير صالحة" });
  }

  const db = readDb();
  
  // Ensure user exists
  const userExists = db.users.some((u: any) => u.id === userId);
  if (!userExists) {
    // Dynamically create temporary or registered user
    db.users.push({
      id: userId,
      name: userId === "user-demo" ? "عبدالله فاروق (أنت)" : userId,
      isYouTuber: false,
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      totalPoints: 0,
      exactScoresCount: 0,
      correctOutcomesCount: 0
    });
  }

  predictions.forEach((pred: any) => {
    const { matchId, predictedHomeScore, predictedAwayScore } = pred;
    
    // Find if a prediction already exists for this match + user
    const existingIndex = db.predictions.findIndex(
      (p: any) => p.userId === userId && p.matchId === matchId
    );

    const predictionData = {
      id: existingIndex >= 0 ? db.predictions[existingIndex].id : `${userId}-${matchId}-${Date.now()}`,
      userId,
      matchId,
      predictedHomeScore: Number(predictedHomeScore),
      predictedAwayScore: Number(predictedAwayScore),
      pointsEarned: null,
      calculated: false
    };

    if (existingIndex >= 0) {
      db.predictions[existingIndex] = predictionData;
    } else {
      db.predictions.push(predictionData);
    }
  });

  writeDb(db);
  res.json({ success: true, message: "تم حفظ التوقعات بنجاح" });
});

// 3. ADMIN: CREATE GAMEWEEK OR UPDATE MATCHES
app.post("/api/gameweeks", (req, res) => {
  const { title, matches, status } = req.body;
  if (!title || !Array.isArray(matches)) {
    return res.status(400).json({ error: "بيانات الجولة غير مكتملة" });
  }

  const db = readDb();
  const newGwId = `gw-${db.gameweeks.length + 1}`;
  
  const formattedMatches = matches.map((m: any, idx: number) => ({
    id: `m-${newGwId}-${idx}-${Date.now()}`,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeLogo: m.homeLogo || "⚽",
    awayLogo: m.awayLogo || "⚽",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    date: m.date || new Date().toISOString().split('T')[0],
    league: m.league || "الدوري الممتاز"
  }));

  const newGw = {
    id: newGwId,
    title,
    status: status || "upcoming",
    matches: formattedMatches
  };

  db.gameweeks.push(newGw);

  // Automatically generate predictions for YouTubers for these new matches!
  const youtubers = db.users.filter((u: any) => u.isYouTuber);
  formattedMatches.forEach((m: any) => {
    youtubers.forEach((yt: any) => {
      const { predHome, predAway } = generateYouTuberPredictions(m, yt.id);
      db.predictions.push({
        id: `${yt.id}-${m.id}-${Date.now()}`,
        userId: yt.id,
        matchId: m.id,
        predictedHomeScore: predHome,
        predictedAwayScore: predAway,
        pointsEarned: null,
        calculated: false
      });
    });
  });

  writeDb(db);
  res.json({ success: true, gameweek: newGw });
});

// 4. ADMIN: SUBMIT MATCH RESULTS & RUN POINTS ENGINE
app.post("/api/matches/results", (req, res) => {
  const { gameweekId, matchId, homeScore, awayScore, status } = req.body;
  if (!gameweekId || !matchId || homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: "بيانات النتيجة غير صالحة" });
  }

  const db = readDb();

  // 1. Find and update the match
  const gwIndex = db.gameweeks.findIndex((g: any) => g.id === gameweekId);
  if (gwIndex === -1) return res.status(404).json({ error: "لم يتم العثور على الجولة" });

  const matchIndex = db.gameweeks[gwIndex].matches.findIndex((m: any) => m.id === matchId);
  if (matchIndex === -1) return res.status(404).json({ error: "لم يتم العثور على المباراة" });

  const match = db.gameweeks[gwIndex].matches[matchIndex];
  match.homeScore = Number(homeScore);
  match.awayScore = Number(awayScore);
  match.status = status || "finished";

  // Check if all matches in this gameweek are completed, and set gameweek status to live/completed
  const allFinished = db.gameweeks[gwIndex].matches.every((m: any) => m.status === "finished");
  if (allFinished) {
    db.gameweeks[gwIndex].status = "completed";
  } else {
    db.gameweeks[gwIndex].status = "live";
  }

  // 2. Calculate points for all predictions for this match
  const matchPredictions = db.predictions.filter((p: any) => p.matchId === matchId);
  matchPredictions.forEach((pred: any) => {
    const points = calculatePoints(
      pred.predictedHomeScore,
      pred.predictedAwayScore,
      match.homeScore,
      match.awayScore
    );
    pred.pointsEarned = points;
    pred.calculated = true;
  });

  // 3. Recalculate users' total points
  db.users.forEach((user: any) => {
    const userPredictions = db.predictions.filter((p: any) => p.userId === user.id && p.calculated);
    let totalPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;

    userPredictions.forEach((p: any) => {
      totalPoints += p.pointsEarned || 0;
      if (p.pointsEarned === 5) {
        exactScores += 1;
      } else if (p.pointsEarned && p.pointsEarned > 0) {
        correctOutcomes += 1;
      }
    });

    user.totalPoints = totalPoints;
    user.exactScoresCount = exactScores;
    user.correctOutcomesCount = correctOutcomes;
  });

  writeDb(db);
  res.json({ success: true, message: "تم تحديث النتيجة وحساب النقاط لجميع المتوقعين بنجاح" });
});

// 5. SIGNUP / LOGIN NEW USER (FAN)
app.post("/api/auth/register", (req, res) => {
  const { name, favoriteTeam } = req.body;
  if (!name) return res.status(400).json({ error: "الرجاء إدخال الاسم" });

  const db = readDb();
  const cleanName = name.trim();
  
  // Check if user already exists
  let existingUser = db.users.find((u: any) => u.name.toLowerCase() === cleanName.toLowerCase());
  
  if (existingUser) {
    return res.json({ success: true, user: existingUser, isNew: false });
  }

  // Create new user
  const newUser = {
    id: `user-${Date.now()}`,
    name: cleanName,
    isYouTuber: false,
    avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150`,
    totalPoints: 0,
    exactScoresCount: 0,
    correctOutcomesCount: 0,
    favoriteTeam: favoriteTeam || "غير محدد"
  };

  db.users.push(newUser);
  writeDb(db);
  res.json({ success: true, user: newUser, isNew: true });
});

// 6. GEMINI GENERATE SARCASTIC EL MASTABA COMMENTARY
app.post("/api/gemini/commentary", async (req, res) => {
  const { gameweekId } = req.body;
  if (!gameweekId) {
    return res.status(400).json({ error: "الرجاء تزويد معرّف الجولة" });
  }

  const db = readDb();
  const gwIndex = db.gameweeks.findIndex((g: any) => g.id === gameweekId);
  if (gwIndex === -1) {
    return res.status(404).json({ error: "لم يتم العثور على الجولة" });
  }
  const gameweek = db.gameweeks[gwIndex];

  // Gather predictions data for YouTubers
  const youtubers = db.users.filter((u: any) => u.isYouTuber);
  const youtuberDetails = youtubers.map((yt: any) => {
    const ytPreds = db.predictions.filter((p: any) => p.userId === yt.id && gameweek.matches.some((m: any) => m.id === p.matchId));
    const predSummary = ytPreds.map((p: any) => {
      const match = gameweek.matches.find((m: any) => m.id === p.matchId);
      const matchText = match ? `${match.homeTeam} ضد ${match.awayTeam} (النتيجة الفعلية: ${match.homeScore ?? 'لم تلعب'}-${match.awayScore ?? 'لم تلعب'})` : '';
      return `${matchText} -> توقعه: ${p.predictedHomeScore}-${p.predictedAwayScore} (النقاط التي حصل عليها: ${p.pointsEarned ?? 'غير محسوبة'})`;
    }).join("\n");

    return `- ${yt.name} (مجموع نقاطه الحالي: ${yt.totalPoints}):\n${predSummary}`;
  }).join("\n\n");

  const matchesSummary = gameweek.matches.map((m: any) => 
    `- ${m.homeTeam} ضد ${m.awayTeam} -> النتيجة: ${m.homeScore ?? '?'}-${m.awayScore ?? '?'}`
  ).join("\n");

  const prompt = `
أنت كاتب سيناريو وحوار كوميدي رياضي مصري محترف. اكتب سيناريو حلقة ساخرة جداً تسمى "برنامج المصطبة" (El Mastaba) حيث يناقش يوتيوبرز الرياضة الأربعة المشهورين نتائج جولتهم وتوقعاتهم الكارثية لمباريات كرة القدم الأخيرة.

الشخصيات الأربعة وطباعهم الكوميدية في البرنامج:
1. ممدوح نصر الله: منفعل للغاية ومسرحي، يدافع بجنون وبكاء وصراخ عن آرسنال ويبرر خسائره بـ "المؤامرة الكونية"، ويتحدث بعاطفة ومصطلحات تكتيكية ضخمة كأنه غوارديولا.
2. مصعب الغندور: هادئ للغاية، عقلاني تكتيكي بارد، يمسك القلم والمسطرة ويحلل الدفاع والـ "لو بلوك" (Low Block)، ويتفاخر بتوقعاته الهادئة (التي غالباً ما تكون 1-0 لميلان أو ريال مدريد).
3. أحمد الخفيف: ساخر جداً، يحب إلقاء الإفيهات الشعبية المصرية والتنمر اللطيف والتنكيد على مشجعي مانشستر يونايتد وتشيلسي، توقعاته دائماً عجيبة ومفاجئة ويحب الضحك على غضب زملائه.
4. مروان ديربي: مشجع شغوف لبرشلونة، يدافع عن الكرة الجميلة، عاطفي جداً ويتحمس كالمعلقين الإسبان ويغضب بسرعة من برود مصعب وسخرية الخفيف.

تفاصيل الجولة الحالية (${gameweek.title}):
المباريات ونتائجها:
${matchesSummary}

توقعات اليوتيوبرز ونقاطهم التي حصلوا عليها في هذه الجولة:
${youtuberDetails}

اكتب حواراً حياً بالعامية المصرية (Egyptian Arabic) يتبادلون فيه الضحك والصراخ، ركز على:
- سخرية الخفيف من توقعات ممدوح أو مروان الكارثية.
- انفعال ممدوح ودفاعه الدرامي.
- هدوء مصعب التكتيكي ومفاخرته بنقاطه.
- غضب مروان وتحمسه لبرشلونة أو فريقه المفضل.
- استخدام مصطلحات مصرية شهيرة مثل: "تغفيلة"، "على المسطرة"، "باصي لعم حارث"، "تكتيك المكواة"، "المؤامرة الكونية"، "يا فخر العرب".

اجعل الحوار ممتعاً ومقسماً إلى شخصيات واضحة ومسترسل، وينتهي بوعود ساخرة للجولة القادمة.
اكتب الحوار مباشرة كحوار نصي جميل بدون مقدمات فلسفية أو تعقيب خارجي.
`;

  const ai = getGeminiAI();
  if (!ai) {
    // Generate a high fidelity fallback mock commentary in case API key is missing
    const fallbackCommentary = `ممدوح نصر الله: "يا جماعة، حرام والله! آرسنال كان بيلعب تكتيك عالمي، لولا التغفيلة والتحكيم كنا كسبنا خمسة مستريح! الخفيف بيضحك؟ اضحك يا خفيف، بكرة نشوف مانشستر يونايتد هيعمل إيه!"\n\nأحمد الخفيف: "يا ممدوح يا حبيبي، آرسنال مين اللي يكسب خمسة؟ إنت توقعت ٣-١ والنتيجة طلعت ٢-٢ بالعافية! أنا بقى توقعت الخسارة لليونايتد وطلعت صح، الضحك بجد على توقعات مروان اللي فاكر برشلونة لسه في ٢٠٠٩!"\n\nمروان ديربي: "برشلونة هيرجع يا خفيف! والنتيجة ٣-١ لريال مدريد دي كانت صدفة بحتة بسبب غياب العمق الدفاعي. مصعب قاعد يبتسم كأنه جايب الديب من ديله!"\n\nمصعب الغندور: "أنا جايب الديب فعلاً يا مروان. مباراة ميلان كانت لو بلوك مثالي وماتش مدريد تكتيك عبقري. توقعت الـ ١-٠ والتزمنا الهدوء وحصلنا على الـ ٥ نقط كاملة بالمسطرة والقلم. التكتيك مبيجذبش!"`;
    gameweek.aiCommentary = fallbackCommentary;
    db.gameweeks[gwIndex] = gameweek;
    writeDb(db);
    return res.json({ success: true, commentary: fallbackCommentary });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "أنت يوتيوبر كروي مصري ساخر تحاكي برنامج المصطبة.",
        temperature: 0.8,
      }
    });

    const commentary = response.text || "فشل توليد الحوار الساخر، جرب لاحقاً!";
    gameweek.aiCommentary = commentary;
    db.gameweeks[gwIndex] = gameweek;
    writeDb(db);
    res.json({ success: true, commentary });
  } catch (error: any) {
    console.error("Gemini Commentary Error:", error);
    res.status(500).json({ error: "فشل في التواصل مع خادم الذكاء الاصطناعي لحساب الحوار" });
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Vite dev server mounting after API routes
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development full-stack server running on http://localhost:${PORT}`);
    });
  });
}

if (process.env.NODE_ENV === "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production full-stack server running on http://localhost:${PORT}`);
  });
}
