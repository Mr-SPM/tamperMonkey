// ==UserScript==
// @name         FT Pre Winner
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  FT predict tool
// @author       Mr-SPM
// @match        *://zq.win007.com/analysis/*
// @icon         https://www.google.com/s2/favicons?domain=netease.com
// @require      https://unpkg.com/react@16/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@16/umd/react-dom.production.min.js
// @require      https://cdn.bootcss.com/echarts/4.2.1/echarts.min.js
// @grant        none
// @contributionURL            https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=your.email.here@412354742@qq.com&item_name=Greasy+Fork+donation
// ==/UserScript==

declare const $: any;
declare const $_Our: any;
declare const $$_Our: any;

declare interface Window {
  hometeam: string;
  guestteam: string;
  h2h_home: number;
  h2h_away: number;
  strTime: string;
  arrLeague: number[];
  v_data: any[];
  h_data: any[];
  a_data: any[];
  $_Our: any;
  $$_Our: any;
}

interface Series {
  name: string;
  type: string;
  data: any[];
  areaStyle?: any;
}

interface EchartsConfig {
  series: {
    1: any[];
    x: any[];
    2: any[];
  };
  legendData: string[];
}

interface PredictInfo {
  avg: string[];
  first: string[];
  odd: string[];
  predict: number[];
}

interface Data {
  home: any[];
  guest: any[];
  vs: any[];
}

// 获取比分
function getScore(data: number[]) {
  return {
    all: [data[1], data[2]],
    half: [data[3], data[4]],
  };
}

function getAVG(data: any[], length: number) {
  let s = 0;
  let f = 0;
  data.slice(0, length).forEach((item) => {
    s += item[8];
    f += item[9];
  });
  return {
    s: parseFloat((s / length).toFixed(2)),
    f: parseFloat((f / length).toFixed(2)),
  };
}

(function () {
  'use strict';
  //#region  添加react
  function addReact() {
    const root = document.createElement('div');
    root.id = 'myReact';
    root.style.position = 'absolute';
    root.style.zIndex = '2000';
    root.style.left = '0px';
    root.style.top = '100px';
    document.body.appendChild(root);
  }
  //#endregion

  // 计算
  function predict(
    sum: number,
    re: number,
    odd: number,
    rate: number,
    resultRate: number
  ) {
    if (sum && re && odd) {
      var p = re / 100 / odd;
      return parseInt(
        (((((odd + 1) * p - 1) / odd) * sum * rate * resultRate) / 5).toString()
      );
    } else {
      return 0;
    }
  }

  function getPredict(data: OddInfo[], price: number): PredictInfo {
    const sum = [0, 0, 0];
    data.forEach((item) => {
      sum[0] += parseFloat(item.kaili[0]);
      sum[1] += parseFloat(item.kaili[1]);
      sum[2] += parseFloat(item.kaili[2]);
    });
    return {
      avg: sum.map((item) => (item / data.length).toFixed(2)),
      first: data[0].kaili,
      odd: data[0].odd,
      predict: [
        predict(price, 96, parseFloat(data[0].odd[0]), 5, 1.33),
        predict(price, 96, parseFloat(data[0].odd[1]), 5, 0.61),
        predict(price, 96, parseFloat(data[0].odd[2]), 5, 0.91),
      ],
    };
  }

  function init(id: any, count: any, checked = true) {
    var data = [];
    var chks = $$_Our(id + '_l');
    switch (id) {
      case 'v':
        data = window.v_data;
        break;
      case 'hn':
      case 'h':
        data = window.h_data;
        break;
      case 'an':
      case 'a':
        data = window.a_data;
        break;
    }
    const newdata: any[] = [];
    for (var i = 0; i < data.length; i++) {
      if (
        id == 'v' &&
        checked &&
        (data[i][6] == window.h2h_home ||
          data[i][5].toString().indexOf('(中)') != -1)
      )
        continue;
      if (
        id == 'hn' &&
        checked &&
        (data[i][4] != window.h2h_home ||
          data[i][5].toString().indexOf('(中)') != -1)
      )
        continue;
      if (
        id == 'an' &&
        checked &&
        (data[i][6] != window.h2h_away ||
          data[i][5].toString().indexOf('(中)') != -1)
      )
        continue;
      var f1 = 0;
      for (var j = 0; j < chks.length; j++)
        if (
          data[i][1] == chks[j].id.substr(0, chks[j].id.indexOf('_')) &&
          chks[j].checked == false
        ) {
          f1 = 1;
          break;
        }
      if (f1 == 1) continue;
      newdata.push(data[i]);
    }
    return newdata;
  }

  function initOption(data: any[], titie: string) {
    const option: echarts.EChartOption = {
      title: {
        text: titie,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: data.map((item) => item[0]),
      },
      yAxis: {
        type: 'value',
        min: 'dataMin',
        max: 'dataMax',
      },
      series: [
        {
          name: '进球',
          type: 'line',
          data: data.map((item) => item[8]),
        },
        {
          name: '被进球',
          type: 'line',
          data: data.map((item) => -item[9]),
        },
      ],
      legend: {
        top: 20,
        data: ['进球', '被进球'],
      },
    };
    return option;
  }

  const useState = React.useState;

  //#region
  const MyComponent: React.FC = () => {
    const score = getScore(window.arrLeague);
    const [price, setPrice] = useState(
      localStorage.getItem('my.price') || '300'
    );

    const renderCharts = (data: Data) => {
      // 基于准备好的dom，初始化echarts实例
      var myChart1 = echarts.init(
        document.getElementById('main1') as HTMLDivElement
      );
      var myChartx = echarts.init(
        document.getElementById('mainx') as HTMLDivElement
      );
      const homeData = data.home.slice(0, 5).reverse();
      const guestData = data.guest.slice(0, 5).reverse();

      // 使用刚指定的配置项和数据显示图表。
      myChart1.setOption(initOption(homeData, window.hometeam));
      myChartx.setOption(initOption(guestData, window.guestteam));
    };

    const [showData, setShowData] = useState(true);

    const [matchCount, setMatchCount] = useState(
      localStorage.getItem('my.matchCount') || '5'
    );

    const [data, setData] = useState<Data>();
    const [checked, setChecked] = useState<boolean>(
      !localStorage.getItem('my.checked') || true
    );

    const [avgInfo, setAVGInfo] = useState({
      home: {
        s: 0,
        f: 0,
        x: '',
      },
      guset: {
        s: 0,
        f: 0,
        x: '',
      },
    });

    React.useEffect(() => {
      const obj: Data = {
        home: init('hn', matchCount, true),
        guest: init('an', matchCount, true),
        vs: init('v', 5, false),
      };
      console.log(obj);
      const homeAVG = getAVG(obj.home, parseInt(matchCount));
      const guestAVG = getAVG(obj.guest, parseInt(matchCount));
      setAVGInfo({
        home: {
          ...homeAVG,
          x: ((homeAVG.s + guestAVG.f) / 2).toFixed(2),
        },
        guset: {
          ...guestAVG,
          x: ((homeAVG.f + guestAVG.s) / 2).toFixed(2),
        },
      });
      setData(obj);
      renderCharts(obj);
    }, []);

    return (
      <div
        style={{
          border: '1px solid #f2f2f2',
          width: 600,
          zIndex: 2,
          background: '#fff',
          overflow: 'auto',
          padding: 16,
        }}
      >
        <div>
          <button onClick={() => setShowData(!showData)}>
            {!showData ? 'Show' : 'Hide'}
          </button>
        </div>
        <div>
          <h1>比分</h1>
          <div style={{ color: 'red', fontSize: 24 }}>
            {score.all[0]} : {score.all[1]}
          </div>
          <div>
            {score.half[0]} : {score.half[1]}
          </div>
        </div>
        <div style={{ display: showData ? 'block' : 'none' }}>
          <div>
            <h1>预测比分</h1>
            <div style={{ display: 'flex' }}>
              <div>
                {window.hometeam}
                <p>{avgInfo.home.s}</p>
                <p>{avgInfo.home.f}</p>
                <p style={{ color: 'red', fontSize: 18 }}>{avgInfo.home.x}</p>
              </div>
              <div>
                {window.guestteam}
                <p>{avgInfo.guset.s}</p>
                <p>{avgInfo.guset.f}</p>
                <p style={{ color: 'red', fontSize: 18 }}>{avgInfo.guset.x}</p>
              </div>
            </div>
          </div>
          <input
            value={matchCount}
            type="number"
            onChange={(e) => {
              setMatchCount(e.target.value);
              localStorage.setItem('my.matchCount', e.target.value);
            }}
          />
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setChecked(e.target.checked);
              localStorage.setItem(
                'my.checked',
                e.target.checked ? '' : 'false'
              );
            }}
          />
          同主客
          <h1>Charts</h1>
          <div id="main1" style={{ width: '100%', height: 300 }}></div>
          <div id="mainx" style={{ width: '100%', height: 300 }}></div>
        </div>
      </div>
    );
  };
  //#endregion
  function main() {
    addReact();
    const root = document.querySelector('#myReact');
    ReactDOM.render(<MyComponent />, root);
  }
  main();
})();
