export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.stock.naver.com/'
    };

    try {
        // 주소를 모두 m.stock.naver.com 모바일 전용으로 통일 (가장 차단이 덜함)
        const urls = [
            'https://m.stock.naver.com/api/index/KOSPI/basic',
            'https://m.stock.naver.com/api/index/KOSDAQ/basic',
            'https://m.stock.naver.com/api/index/.IXIC/basic', // 나스닥도 모바일 주소로 변경
            'https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW'
        ];

        const fetchWithFallback = async (url) => {
            try {
                const r = await fetch(url, { headers });
                if (!r.ok) return null;
                return await r.json();
            } catch (e) {
                return null;
            }
        };

        const responses = await Promise.all(urls.map(url => fetchWithFallback(url)));

        const parseIndex = (data, name) => {
            if (!data) return { price: "0.00", percent: "0.00", isUp: true }; // 데이터 없으면 0.00 처리

            let info = data;
            // 환율 데이터(배열) 처리
            if (Array.isArray(data) && data.length > 0) info = data[0]; 
            else if (data.result && Array.isArray(data.result)) info = data.result[0];
            
            // 데이터가 비었거나 구조가 다를 경우 방어
            if (!info || !info.closePrice) return { price: "0.00", percent: "0.00", isUp: true };

            const price = parseFloat(info.closePrice.replace(/,/g, ''));
            
            // 등락폭/등락률 필드명이 지수마다 다를 수 있어 체크
            const changeStr = info.compareToPreviousClosePrice || info.fluctuations || "0";
            const percentStr = info.fluctuationsRatio || info.fluctuationsRate || "0";
            
            const change = parseFloat(changeStr.replace(/,/g, ''));
            const percent = parseFloat(percentStr.replace(/,/g, ''));
            
            // 네이버는 하락이어도 compareToPreviousClosePrice가 양수로 오는 경우가 있음
            // fluctuationsRatio가 마이너스면 isUp = false
            const isUp = percentStr.includes('-') ? false : true;

            return {
                price: price.toLocaleString(undefined, {maximumFractionDigits: 2}),
                percent: percent.toFixed(2),
                isUp: isUp
            };
        };

        res.status(200).json({
            kospi: parseIndex(responses[0], 'KOSPI'),
            kosdaq: parseIndex(responses[1], 'KOSDAQ'),
            nasdaq: parseIndex(responses[2], 'NASDAQ'),
            exchange: parseIndex(responses[3], 'USD')
        });

    } catch (e) {
        console.error("Indices Error:", e);
        // 전체 에러 시에도 빈 값 반환해서 프론트엔드 undefined 방지
        res.status(200).json({
            kospi: { price: "-", percent: "0", isUp: true },
            kosdaq: { price: "-", percent: "0", isUp: true },
            nasdaq: { price: "-", percent: "0", isUp: true },
            exchange: { price: "-", percent: "0", isUp: true }
        });
    }
}
