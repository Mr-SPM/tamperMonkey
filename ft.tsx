// ==UserScript==
// @name         FT Winner
// @namespace    http://tampermonkey.net/
// @version      0.3.5
// @description  FT predict tool
// @author       Mr-SPM
// @match        *://op1.win007.com/oddslist/*
// @match        *://vip.win0168.com/1x2/oddslist/*
// @icon         https://www.google.com/s2/favicons?domain=netease.com
// @require      https://unpkg.com/react@16/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@16/umd/react-dom.production.min.js
// @require      https://cdn.bootcss.com/echarts/4.2.1/echarts.min.js
// @grant        none
// @contributionURL            https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=your.email.here@412354742@qq.com&item_name=Greasy+Fork+donation
// ==/UserScript==

declare interface Window {
  time?: number | string;
  hsDetail?: any;
  odd?: string[];
  $?(): () => HTMLElement;
  MatchTime?: any;
  re?: number;
  getCompanyName(id: string): string;
  game: string[];
}

interface IProps {
  matchTime: number;
}

interface BCInfo {
  id: string;
  hash: string;
  name: string;
  changes: OddInfo[];
}

interface OddInfo {
  key: number; //时间戳
  odd: string[]; // odd数组
  kaili: string[];
  time: string; //时间字符串
  value?: any;
  timeX: number;
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

  //#region  全局变量
  const year = new Date().getFullYear();
  let hasInit = false;
  //#endregion

  function getMatchTime() {
    const temp = window.MatchTime.split(',');
    return (
      new Date(
        `${temp[0]}-${temp[1].substring(0, 2)}-${temp[2]} ${temp[3]}:${temp[4]}`
      ).getTime() + 28800000
    );
  }
  // 获取时间差
  function getTimeX(time: number, t: number) {
    return Math.round((time - t) / 60000);
  }

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

  const useState = React.useState;

  //#region
  const MyComponent: React.FC<IProps> = (props) => {
    const [data, setData] = useState<BCInfo[]>([]);
    const [timeX, setTimeX] = useState(
      localStorage.getItem('my.timeX') || 1440
    );
    const [autoCheck, setAutoCheck] = useState(
      !!localStorage.getItem('my.autoCheck') || false
    );
    const [price, setPrice] = useState(
      localStorage.getItem('my.price') || '300'
    );
    const [score, setScore] = useState(['0', '0']);
    const [predictInfo, setPredictInfo] = useState<PredictInfo>({
      avg: [],
      first: [],
      odd: [],
      predict: [],
    });
    const [chooseIndex, setChooseIndex] = useState(-1);
    const chartsKey = (localStorage.getItem('my.key') || 'odd') as
      | 'odd'
      | 'kaili';
    const echartsConfig = React.useRef<EchartsConfig>({
      series: {
        1: [],
        x: [],
        2: [],
      },
      legendData: [] as string[],
    });

    const rightCount = localStorage.getItem('my.rightCount') || '0';
    const sumCount = localStorage.getItem('my.sumCount') || '0';

    const autoSetMoney = (data: PredictInfo) => {
      if (autoCheck && props.matchTime + 7200000 < new Date().getTime()) {
        const x = parseInt(score[0]) - parseInt(score[1]);
        let i = 0;
        let temp = 100;
        data.avg.forEach((item, index) => {
          if (temp > parseFloat(item)) {
            i = index;
            temp = parseFloat(item);
          }
        });
        function isRight(x: number, index: number) {
          switch (index) {
            case 0:
              return x > 0;
            case 1:
              return x === 0;
            case 2:
              return x < 0;
            default:
              return false;
          }
        }
        const flag = isRight(x, i);
        if (flag) {
          localStorage.setItem(
            'my.rightCount',
            (Number(rightCount) + 1).toString()
          );
        }
        localStorage.setItem('my.sumCount', (Number(sumCount) + 1).toString());
        calPrice(data.predict[i], flag, data.odd[i]);
        setChooseIndex(i);
        console.log('计算完成', i, flag);
      }
    };

    // 获取变化列表
    function getChange(key: string, time: number, timeX = 1440): OddInfo[] {
      let changes = window.hsDetail.items(parseInt(key));
      const array: OddInfo[] = [];
      const datas = changes.split(';');
      for (let i = 0; i < datas.length; i++) {
        const temp = datas[i].split('|');
        const _time = new Date(year + '-' + temp[3]).getTime();
        const _timeX = getTimeX(time, _time);
        if (_timeX < timeX) {
          const obj = {
            key: _time,
            time: year + '-' + temp[3],
            timeX: _timeX,
            odd: [temp[0], temp[1], temp[2]],
            kaili: [temp[4], temp[5], temp[6]],
          };
          array.push(obj);
        }
      }
      return array;
    }
    React.useEffect(() => {
      // 获取数据
      const getData = () => {
        const bcs: BCInfo[] = window.game.map((item) => {
          const rs = item.split('|');
          const bc: BCInfo = {
            id: rs[0],
            name: window.getCompanyName(rs[0]),
            hash: rs[1],
            changes: getChange(rs[1], props.matchTime, Number(timeX)),
          };
          setseries(bc.changes, bc.name);
          return bc;
        });
        console.log('bcs', bcs);
        console.log('charts', echartsConfig.current);

        setData(bcs);
      };
      if (new Date().getTime() > props.matchTime + 7200000) {
        const scores = document.getElementsByClassName('score');
        setScore([scores[0].innerHTML, scores[1].innerHTML]);
      }
      getData();
      setTimeout(renderCharts, 0);
    }, []);

    React.useEffect(() => {
      if (data && data.length > 0) {
        const rs = getPredict(data[0].changes, parseFloat(price));
        setPredictInfo(rs);
        autoSetMoney(rs);
      }
    }, [data]);

    function setseries(obj: OddInfo[], name: string) {
      const temp1: Series = {
        type: 'line',

        name: `${name}`,
        data: [],
      };
      const temp2: Series = {
        type: 'line',

        name: `${name}`,
        data: [],
      };
      const temp3: Series = {
        type: 'line',

        name: `${name}`,
        data: [],
      };
      // if (needArea) {
      //   temp1.areaStyle = { origin: 'end' };
      //   temp2.areaStyle = { origin: 'end' };
      //   temp3.areaStyle = { origin: 'end' };
      // }
      echartsConfig.current.legendData.push(name);
      obj.forEach(function (item) {
        temp1.data.push([item.timeX, parseFloat(item[chartsKey][0])]);
        temp2.data.push([item.timeX, parseFloat(item[chartsKey][1])]);
        temp3.data.push([item.timeX, parseFloat(item[chartsKey][2])]);
      });
      echartsConfig.current.series[1].push(temp1);
      echartsConfig.current.series['x'].push(temp2);
      echartsConfig.current.series[2].push(temp3);
    }

    const renderCharts = () => {
      // 基于准备好的dom，初始化echarts实例
      var myChart1 = echarts.init(
        document.getElementById('main1') as HTMLDivElement
      );
      var myChartx = echarts.init(
        document.getElementById('mainx') as HTMLDivElement
      );
      var myChart2 = echarts.init(
        document.getElementById('main2') as HTMLDivElement
      );
      const baseOption: echarts.EChartOption = {
        title: {
          text: '走势',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
        },
        xAxis: {
          type: 'value',
          min: 'dataMin',
          max: 'dataMax',
          inverse: true,
        },
        yAxis: {
          type: 'value',
          min: 'dataMin',
          max: 'dataMax',
          inverse: true,
        },
        series: [],
        legend: {
          top: 30,
          data: echartsConfig.current.legendData,
        },
      };
      // 指定图表的配置项和数据
      const option1 = {
        ...baseOption,
        title: { text: '走势1', x: 'center' },
        series: echartsConfig.current.series[1],
      };
      const optionx = {
        ...baseOption,
        title: { text: '走势x', x: 'center' },
        series: echartsConfig.current.series['x'],
      };
      const option2 = {
        ...baseOption,
        title: { text: '走势2', x: 'center' },
        series: echartsConfig.current.series[2],
      };

      // 使用刚指定的配置项和数据显示图表。
      myChart1.setOption(option1);
      myChartx.setOption(optionx);
      myChart2.setOption(option2);
    };

    const calPrice = (money: number, flag: boolean, odd = '1') => {
      let newPrice = '';
      if (flag) {
        newPrice = (
          parseFloat(price as string) +
          money * (parseFloat(odd) - 1)
        ).toFixed(2);
      } else {
        newPrice = (parseFloat(price as string) - money).toFixed(2);
      }
      setPrice(newPrice);
      localStorage.setItem('my.price', newPrice);
    };

    const [showData, setShowData] = useState(true);
    /** 重置正确率 */
    const resetRightRate = () => {
      localStorage.setItem('my.rightCount', '0');
      localStorage.setItem('my.sumCount', '0');
      location.reload();
    };

    //#region  图表类型
    const toggleCharts = () => {
      localStorage.setItem('my.key', chartsKey === 'odd' ? 'kaili' : 'odd');
      location.reload();
    };
    //#endregion

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
          {score[0]} : {score[1]}
        </div>
        <div style={{ display: showData ? 'block' : 'none' }}>
          <div>
            <h1 style={{ display: 'flex', width: '100%' }}>
              计算
              <div style={{ flex: 1, textAlign: 'right' }}>
                <input
                  type="checkbox"
                  checked={autoCheck}
                  onChange={(e) => {
                    setAutoCheck(e.target.checked);
                    localStorage.setItem(
                      'my.autoCheck',
                      e.target.checked ? 'true' : ''
                    );
                  }}
                ></input>
                <label htmlFor="ck">自动计算</label>
              </div>
            </h1>
            <div>
              <label htmlFor="price">Score</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  localStorage.setItem('my.price', e.target.value);
                }}
              />
            </div>
            <div>
              <h1>Predict</h1>
              <h2>
                正确率：{' '}
                {((parseInt(rightCount) / parseInt(sumCount)) * 100).toFixed(2)}
              </h2>
              <div>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      borderBottom: '1px solid #f2f2f2',
                    }}
                  >
                    avg:{' '}
                    {predictInfo.avg.map((item) => (
                      <span style={{ width: 30, margin: 8, flex: 1 }}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      borderBottom: '1px solid #f2f2f2',
                    }}
                  >
                    first:{' '}
                    {predictInfo.first.map((item) => (
                      <span style={{ width: 30, margin: 8, flex: 1 }}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      borderBottom: '1px solid #f2f2f2',
                    }}
                  >
                    odd:{' '}
                    {predictInfo.odd.map((item) => (
                      <span style={{ width: 30, margin: 8, flex: 1 }}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      borderBottom: '1px solid #f2f2f2',
                    }}
                  >
                    predict:{' '}
                    {predictInfo.predict.map((item, index) => (
                      <span
                        style={{
                          width: 30,
                          margin: 8,
                          color: chooseIndex === index ? 'red' : '#000',
                          flex: 1,
                        }}
                      >
                        {item}
                        <button
                          style={{ padding: 8, margin: 8 }}
                          onClick={() =>
                            calPrice(item, true, predictInfo.odd[index])
                          }
                        >
                          Right
                        </button>
                        <button
                          style={{ padding: 8, margin: 8 }}
                          onClick={() => calPrice(item, false)}
                        >
                          False
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h1>Charts</h1>
            <div id="main1" style={{ width: '100%', height: 300 }}></div>
            <div id="mainx" style={{ width: '100%', height: 300 }}></div>
            <div id="main2" style={{ width: '100%', height: 300 }}></div>
          </div>
          <div>
            <p>
              <label htmlFor="timeX">时间差(h)</label>
              <input
                type="number"
                value={timeX}
                onChange={({ target }) => {
                  setTimeX(target.value);
                  localStorage.setItem('my.timeX', target.value);
                }}
              />
            </p>
            <div>
              <button onClick={resetRightRate}>重置正确率</button>
              <button onClick={toggleCharts}>更换图表({chartsKey})</button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  //#endregion
  function main() {
    addReact();
    const root = document.querySelector('#myReact');
    ReactDOM.render(<MyComponent matchTime={getMatchTime()} />, root);
  }
  main();
})();
