export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    const NAVER_ID = process.env.NAVER_ID;
    const NAVER_SECRET = process.env.NAVER_SECRET;
    const OPENAI_KEY = process.env.OPENAI_KEY;

    try {
        const query = encodeURIComponent("주식 시장");
        const naverUrl = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=5&sort=sim`;

        const naverRes = await fetch(naverUrl, {
            headers: {
                'X-Naver-Client-Id': NAVER_ID,
                'X-Naver-Client-Secret': NAVER_SECRET
            }
        });

        const naverData = await naverRes.json();
        const newsItems = naverData.items || [];

        const titles = newsItems.map((item, index) => `${index + 1}. ${item.title.replace(/<[^>]*>?/g, '')}`).join("\n");

        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Analyze the stock market sentiment. Return JSON object with 'news' array containing 'sentiment' (one of: '호재', '악재', '중립')."
                    },
                    { role: "user", content: titles }
                ],
                response_format: { type: "json_object" }
            })
        });

        const aiData = await aiRes.json();
        let sentiments = [];
        try {
            sentiments = JSON.parse(aiData.choices[0].message.content).news || [];
        } catch (e) { console.error(e); }

        const finalResult = newsItems.map((item, index) => {
            return {
                title: item.title.replace(/<[^>]*>?/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
                link: item.link,
                description: item.description.replace(/<[^>]*>?/g, '').slice(0, 60) + "...",
                date: new Date(item.pubDate).toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'}),
                sentiment: sentiments[index]?.sentiment || "중립"
            };
        });

        res.status(200).json(finalResult);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'News Fetch Failed' });
    }
}

