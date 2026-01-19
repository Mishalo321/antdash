// api/news.js

export default async function handler(req, res) {
    // 👇 [추가] 이 한 줄이 핵심입니다! 
    // 설명: "브라우저(Vercel)야, 이 결과를 60초(1분) 동안 기억해두고 재사용해!"
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    // ... (아래는 기존 코드 그대로) ...
    const NAVER_ID = process.env.NAVER_ID; 
    // ...

// 파일 경로: api/news.js
export default async function handler(req, res) {
    // Vercel 설정에서 키를 몰래 가져옵니다. (코드에 직접 적지 않음!)
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

        // 뉴스 제목 추출
        const titles = newsItems.map((item, index) => `${index + 1}. ${item.title.replace(/<[^>]*>?/g, '')}`).join("\n");

        // OpenAI에게 분석 요청
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

        // 결과 합치기
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
