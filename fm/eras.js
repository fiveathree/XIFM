/* Eras the career mode can start in. Each era is its own set of data files (fm/DATA_SPEC.md), loaded on demand:
   a page holds one era at a time (switching era reloads the page with ?era=YYYY). Only list an era once all its files exist.
   cl: real Champions League groups for that season (club names as in the data; missing clubs are filled by reputation).
   ueEng: the real English UEFA Cup entrants. Without them the first season's European places go by reputation. */
const ERA_FILES = ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'ned1', 'por1', 'tur1', 'bel1', 'eur', 'pos2', 'youth'];   // pos2 and youth are optional
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
    dir: 'fm/data/', files: ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'eur', 'ned1', 'por1', 'tur1', 'bel1', 'pos2', 'youth'],
  },
};
