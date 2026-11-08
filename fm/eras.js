/* Eras the career mode can start in. Each era is its own set of data files (fm/DATA_SPEC.md), loaded on demand:
   a page holds one era at a time (switching era reloads the page with ?era=YYYY). Only list an era once all its files exist.
   cl: real Champions League groups for that season (club names as in the data; missing clubs are filled by reputation).
   ueEng: the real English UEFA Cup entrants. Without them the first season's European places go by reputation. */
const ERA_FILES = ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'ned1', 'por1', 'tur1', 'bel1', 'eur', 'pos2', 'youth', 'bio'];   // pos2, youth and bio are optional
FM.ERAS = {
  2004: {
    n: '2004/05', d: '摩連奴第一季帶車路士封王；利物浦伊斯坦堡奇蹟；朗拿甸奴、舍甫琴科、亨利當打。',
    dir: 'fm/data/2004/', files: ERA_FILES,
    cl: [['Monaco', 'Liverpool', 'Olympiacos', 'Deportivo'], ['Bayer Leverkusen', 'Real Madrid', 'Dynamo Kyiv', 'Roma'], ['Juventus', 'Bayern Munich', 'Ajax', 'Maccabi Tel Aviv'], ['Lyon', 'Manchester United', 'Fenerbahçe', 'Sparta Prague'],
      ['Arsenal', 'PSV Eindhoven', 'Panathinaikos', 'Rosenborg'], ['AC Milan', 'Barcelona', 'Shakhtar Donetsk', 'Celtic'], ['Inter', 'Werder Bremen', 'Valencia', 'Anderlecht'], ['Chelsea', 'Porto', 'CSKA Moscow', 'Paris Saint-Germain']],
    ueEng: ['Newcastle United', 'Middlesbrough'],
  },
  2010: {
    n: '2010/11', d: '美斯、哈維、恩尼斯達嘅巴塞巔峰；摩連奴皇馬對決；曼聯第 19 冠；巴利同摩甸奴嘅熱刺打入歐聯八強。',
    dir: 'fm/data/2010/', files: ERA_FILES,
    cl: [['Tottenham Hotspur', 'Inter', 'Twente', 'Werder Bremen'], ['Schalke 04', 'Lyon', 'Benfica', 'Hapoel Tel Aviv'], ['Manchester United', 'Valencia', 'Rangers', 'Bursaspor'], ['Barcelona', 'Copenhagen', 'Rubin Kazan', 'Panathinaikos'],
      ['Bayern Munich', 'Roma', 'Basel', 'CFR Cluj'], ['Chelsea', 'Marseille', 'Spartak Moscow', 'Žilina'], ['Real Madrid', 'AC Milan', 'Ajax', 'Auxerre'], ['Shakhtar Donetsk', 'Arsenal', 'Braga', 'Partizan']],
    ueEng: ['Liverpool', 'Aston Villa', 'Manchester City'],
  },
  2020: {
    n: '2020/21', d: '疫情下嘅空場球季：哥迪奧拿曼城重奪英超、車路士奪歐聯；美斯喺巴塞最後一季，C 朗喺祖記；夏蘭特、麥巴比冒起。',
    dir: 'fm/data/2020/', files: ERA_FILES, wk: 3,
    cl: [['Bayern Munich', 'Atlético Madrid', 'Red Bull Salzburg', 'Lokomotiv Moscow'], ['Real Madrid', 'Shakhtar Donetsk', 'Inter', 'Borussia Mönchengladbach'], ['Manchester City', 'Porto', 'Olympiacos', 'Marseille'], ['Liverpool', 'Ajax', 'Atalanta', 'Midtjylland'],
      ['Chelsea', 'Sevilla', 'Krasnodar', 'Rennes'], ['Borussia Dortmund', 'Lazio', 'Club Brugge', 'Zenit St Petersburg'], ['Juventus', 'Barcelona', 'Dynamo Kyiv', 'Ferencváros'], ['Paris Saint-Germain', 'Manchester United', 'RB Leipzig', 'İstanbul Başakşehir']],
    ueEng: ['Tottenham Hotspur', 'Arsenal', 'Leicester City'],
  },
  2025: {
    n: '2025/26', d: '雅馬爾、麥巴比、夏蘭特當打：利物浦以英超冠軍身份開季，巴黎聖日耳門係衛冕歐聯冠軍，夏天轉會市場破紀錄。（當年歐聯係 36 隊聯賽階段，遊戲用 32 隊分組。）',
    dir: 'fm/data/2025/', files: ERA_FILES, wk: 4,
    ueEng: ['Aston Villa', 'Nottingham Forest'],
  },
  1994: {
    n: '1994/95', d: '亞倫舒利亞同薩頓帶布力般流浪封王；簡東拿飛踢球迷；阿積士不敗奪歐聯；AC 米蘭、祖記、拿玻里時代。（英超 22 隊、蘇超 10 隊；歐聯用 32 隊抽籤。）',
    dir: 'fm/data/1994/', files: ERA_FILES,
    ueEng: ['Newcastle United', 'Aston Villa', 'Blackburn Rovers'],
  },
  1998: {
    n: '1998/99', d: '曼聯三冠王；拉素同祖記爭霸意甲；巴塞有菲高、李華度；施丹、朗拿度、巴治奧當打。（當年歐聯只有 24 隊，遊戲用 32 隊抽籤。）',
    dir: 'fm/data/1998/', files: ERA_FILES,
    ueEng: ['Aston Villa', 'Leeds United', 'Liverpool', 'Blackburn Rovers'],
  },
  2001: {
    n: '2001/02', d: '朗拿度、施丹、碧咸年代：曼聯三連霸之後，阿仙奴雙冠王；皇馬銀河艦隊初成。',
    dir: 'fm/data/', files: ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'eur', 'ned1', 'por1', 'tur1', 'bel1', 'pos2', 'youth', 'bio'],
  },
  1999: {
    n: '1999/00', d: '曼聯輕鬆衛冕英超；皇馬奪歐聯；拉素意甲封王；拉科魯尼亞首奪西甲。',
    dir: 'fm/data/1999/', files: ERA_FILES,
  },
  2000: {
    n: '2000/01', d: '曼聯英超三連霸；拜仁點球贏華倫西亞奪歐聯；羅馬意甲封王；利物浦一季奪三個盃。',
    dir: 'fm/data/2000/', files: ERA_FILES,
  },
  2002: {
    n: '2002/03', d: '朗拿度加盟皇馬；AC 米蘭喺奧脫福互射十二碼贏祖記奪歐聯；曼聯奪回英超；碧咸喺曼聯最後一季。',
    dir: 'fm/data/2002/', files: ERA_FILES,
  },
  2003: {
    n: '2003/04', d: '阿布入主車路士；阿仙奴「不敗之師」封王；摩連奴帶波圖奪歐聯；碧咸加盟皇馬。',
    dir: 'fm/data/2003/', files: ERA_FILES,
  },
  2005: {
    n: '2005/06', d: '車路士英超衛冕；朗拿甸奴帶巴塞奪歐聯；季尾爆出意大利電話門醜聞。',
    dir: 'fm/data/2005/', files: ERA_FILES, wk: 1,
  },
  2006: {
    n: '2006/07', d: '電話門之後祖記降落意乙（遊戲冇意乙，所以見唔到佢哋）；AC 米蘭奪歐聯；曼聯奪回英超；C 朗爆發。',
    dir: 'fm/data/2006/', files: ERA_FILES, wk: 1,
  },
  2007: {
    n: '2007/08', d: 'C 朗一季入 42 球，曼聯喺莫斯科互射十二碼贏車路士奪歐聯；阿仙奴、利物浦四強爭霸。',
    dir: 'fm/data/2007/', files: ERA_FILES, wk: 1,
  },
  2008: {
    n: '2008/09', d: '哥迪奧拿第一季，巴塞三冠王；曼聯英超三連霸；C 朗喺曼聯最後一季。',
    dir: 'fm/data/2008/', files: ERA_FILES, wk: 1,
  },
  2009: {
    n: '2009/10', d: 'C 朗、卡卡加盟皇馬；摩連奴帶國際米蘭三冠王；車路士雙冠王。',
    dir: 'fm/data/2009/', files: ERA_FILES, wk: 1,
  },
  2011: {
    n: '2011/12', d: '曼城補時「阿古路時刻」奪英超；車路士喺慕尼黑奪歐聯；美斯一季入 73 球。',
    dir: 'fm/data/2011/', files: ERA_FILES, wk: 2,
  },
  2012: {
    n: '2012/13', d: '費格遜最後一季，曼聯第 20 冠；拜仁三冠王；雲佩斯加盟曼聯。',
    dir: 'fm/data/2012/', files: ERA_FILES, wk: 2,
  },
  2013: {
    n: '2013/14', d: '莫耶斯接手曼聯；蘇亞雷斯帶利物浦差少少封王，最後曼城奪標；皇馬奪第十個歐聯。',
    dir: 'fm/data/2013/', files: ERA_FILES, wk: 2,
  },
  2014: {
    n: '2014/15', d: '摩連奴回巢帶車路士封王；巴塞 MSN 三叉戟三冠王；雲加爾執教曼聯。',
    dir: 'fm/data/2014/', files: ERA_FILES, wk: 2,
  },
  2015: {
    n: '2015/16', d: '李斯特城 5000 倍冷門奪英超；皇馬奪歐聯；哥迪奧拿喺拜仁最後一季。',
    dir: 'fm/data/2015/', files: ERA_FILES, wk: 2,
  },
  2016: {
    n: '2016/17', d: '哥迪奧拿、高普、摩連奴、干地齊集英超；干地帶車路士封王；皇馬衛冕歐聯。',
    dir: 'fm/data/2016/', files: ERA_FILES, wk: 3,
  },
  2017: {
    n: '2017/18', d: '尼馬破紀錄轉會巴黎；曼城 100 分封王；皇馬歐聯三連霸。',
    dir: 'fm/data/2017/', files: ERA_FILES, wk: 3,
  },
  2018: {
    n: '2018/19', d: 'C 朗轉投祖記；曼城以一分力壓利物浦封王；利物浦奪歐聯。',
    dir: 'fm/data/2018/', files: ERA_FILES, wk: 3,
  },
  2019: {
    n: '2019/20', d: '利物浦 30 年後再奪頂級聯賽冠軍；疫情停賽；拜仁三冠王。',
    dir: 'fm/data/2019/', files: ERA_FILES, wk: 3,
  },
  2021: {
    n: '2021/22', d: '美斯加盟巴黎；C 朗回巢曼聯；曼城最後一日封王；皇馬奪歐聯。',
    dir: 'fm/data/2021/', files: ERA_FILES, wk: 4,
  },
  2022: {
    n: '2022/23', d: '夏蘭特加盟曼城首季入 36 球，曼城三冠王；拿玻里 33 年後再奪意甲。',
    dir: 'fm/data/2022/', files: ERA_FILES, wk: 4,
  },
  2023: {
    n: '2023/24', d: '碧寧咸加盟皇馬；利華古遜不敗奪德甲；曼城英超四連霸；皇馬第 15 個歐聯。',
    dir: 'fm/data/2023/', files: ERA_FILES, wk: 4,
  },
  2024: {
    n: '2024/25', d: '麥巴比加盟皇馬；史洛特第一季帶利物浦封王；巴黎聖日耳門首奪歐聯。',
    dir: 'fm/data/2024/', files: ERA_FILES, wk: 4,
  },
  2026: {
    n: '2026/27', d: '而家呢一季：2026 世界盃之後嘅新球季，陣容跟今季開季時 Transfermarkt 嘅資料。',
    dir: 'fm/data/2026/', files: ERA_FILES, wk: 4,
  },
};
