/* Eras the career mode can start in. Each era is its own set of data files (fm/DATA_SPEC.md), loaded on demand:
   a page holds one era at a time (switching era reloads the page with ?era=YYYY). Only list an era once all its files exist.
   cl: real Champions League groups for that season (club names as in the data; missing clubs are filled by reputation).
   ueEng: the real English UEFA Cup entrants. Without them the first season's European places go by reputation. */
FM.ERAS = {
  2001: {
    n: '2001/02', d: '朗拿度、施丹、碧咸年代：曼聯三連霸之後，阿仙奴雙冠王；皇馬銀河艦隊初成。',
    dir: 'fm/data/', files: ['eng1', 'eng2', 'eng3', 'eng4', 'sco1', 'esp1', 'ita1', 'ger1', 'fra1', 'eur', 'ned1', 'por1', 'tur1', 'bel1'],
  },
};
