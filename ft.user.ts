// ==UserScript==
// @name         FT analyz
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @description  分析足球数据，图形化展示赔率走势
// @author       Mr-SPM
// @match        *//op1.win007.com/oddslist/*
// @match        *://vip.win0168.com/1x2/oddslist/*
// @grant        none
// @require      https://cdn.bootcss.com/echarts/4.2.1/echarts.min.js
// @contributionURL            https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=your.email.here@412354742@qq.com&item_name=Greasy+Fork+donation
// contributionAmount  6.66
// ==/UserScript==

declare interface Window {
  time?: number | string;
  hsDetail?: any;
  odd?: number;
  $?(): () => HTMLElement;
  game?: any;
  MatchTime?: any;
}
interface IObejct {
  [params: string]: any;
}

interface OddInfo {
  key: number; //时间戳
  odd: string[]; // odd数组
  time: string; //时间字符串
  value?: IObejct;
}

interface Series {
  name: string;
  type: string;
  data: any[];
  areaStyle?: any;
}

(function() {
  'use strict';
  // id映射
  // totosi 88664978
  // totosi.it 88635286
  // Libo 88726982
  // 365 88691319
  // william  88594327
  // pinnacle 88692817

  // 创建按钮
  function createButton() {
    const button = document.createElement('button');
    button.onclick = function() {
      // renderTotosi(getLatestTotosi());
    };
    button.style.position = 'absolute';
    button.style.left = '100px';
    button.style.top = '150px';
    button.style.color = 'red';
    button.innerHTML = '分析';
    button.style.zIndex = '2000';
    document.body.append(button);
  }

  // 获取数据
  function getData(game: any) {
    const obj = {};
    game.forEach(item => {
      const rs = item.split('|');
      obj[rs[2]] = rs[1];
    });
    const totosi = getLatestTotosi(obj['TotoSi'], obj['Totosi.it']);
    window.time = new Date(totosi.time).toLocaleString();
    delete obj['TotoSi'];
    delete obj['Totosi.it'];
    return {
      totosi: totosi.rs
        ? totosi.rs[0]
        : {
            key: getMatchTime(),
            time: new Date(getMatchTime()).toLocaleString(),
            odd: [0, 0, 0],
          },
      other: obj,
      time: totosi.time,
      totosiSum: totosi.totosis,
    };
  }

  function getChange(key: string): OddInfo[] {
    let changes = window.hsDetail.items(parseInt(key));
    if (!changes) return;
    return changes.split(';').map(item => {
      const temp = item.split('|');
      return {
        key: new Date('2019-' + temp[3]).getTime(),
        time: '2019-' + temp[3],
        odd: [temp[0], temp[1], temp[2]],
      };
    });
  }

  let series = {
    1: [],
    x: [],
    2: [],
  };
  const legendData = [];
  function setseries(
    obj: OddInfo[],
    name: string,
    time: number,
    needArea = false
  ) {
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
    if (needArea) {
      temp1.areaStyle = { origin: 'end' };
      temp2.areaStyle = { origin: 'end' };
      temp3.areaStyle = { origin: 'end' };
    }
    legendData.push(name);
    obj.forEach(function(item) {
      temp1.data.push([getTimeX(time, item.key), parseFloat(item.odd[0])]);
      temp2.data.push([getTimeX(time, item.key), parseFloat(item.odd[1])]);
      temp3.data.push([getTimeX(time, item.key), parseFloat(item.odd[2])]);
    });
    temp1.data = temp1.data.filter(function(item) {
      return item[0] <= 240;
    });
    temp2.data = temp2.data.filter(function(item) {
      return item[0] <= 240;
    });
    temp3.data = temp3.data.filter(function(item) {
      return item[0] <= 240;
    });
    series[1].push(temp1);
    series['x'].push(temp2);
    series[2].push(temp3);
  }
  // 获取其他参数
  function getCloseOthers(data: object, time: number, totosi: OddInfo) {
    const result = [];
    Object.keys(data).forEach(function(item) {
      let temp = {
        name: item,
        value: {},
        x: 0,
        oddx: [],
      };
      const obj = getChange(data[item]);
      setseries(obj, item, getMatchTime());
      for (let i = 0; i < obj.length; i++) {
        if (time - obj[i].key >= 0) {
          temp.value = obj[i];
          temp.x = Math.round((time - obj[i].key) / 1000);
          // 获取差值
          temp.oddx = [
            (parseFloat(obj[i].odd[0]) - parseFloat(totosi[0])).toFixed(2),
            (parseFloat(obj[i].odd[1]) - parseFloat(totosi[1])).toFixed(2),
            (parseFloat(obj[i].odd[2]) - parseFloat(totosi[2])).toFixed(2),
          ];
          break;
        }
      }
      result.push(temp);
    });
    return result.filter(function(item) {
      return !!item.oddx && item.x < 1800;
    });
  }

  function getLatestOthers(data: object, time: number, totosi: OddInfo[][]) {
    const result = [];
    totosi.forEach(t => {
      Object.keys(data).forEach(function(item) {
        const obj = getChange(data[item]);
        setseries(obj, item, getMatchTime());
        if (obj.length > 0) {
          result.push({
            name: item,
            x: Math.round((t[0].key - obj[0].key) / 1000),
            oddx: [
              (parseFloat(obj[0].odd[0]) - parseFloat(t[0].odd[0])).toFixed(2),
              (parseFloat(obj[0].odd[1]) - parseFloat(t[0].odd[1])).toFixed(2),
              (parseFloat(obj[0].odd[2]) - parseFloat(t[0].odd[2])).toFixed(2),
            ],
            value: obj[0],
          });
        }
      });
    });
    return result;
  }

  // 获取时间最近的TotoSi
  function getLatestTotosi(key1: string, key2: string) {
    let time = new Date().getTime();
    let rs;
    const totosi1 = getChange(key1);
    const totosi2 = getChange(key2);

    if (totosi1 && !totosi2) {
      time = new Date(totosi1[0].time).getTime();
      setseries(totosi1, 'totosi', getMatchTime(), true);
      rs = totosi1;
    } else if (!totosi1 && totosi2) {
      time = new Date(totosi2[0].time).getTime();
      setseries(totosi2, 'totosi', getMatchTime(), true);
      rs = totosi2;
    } else if (!totosi1 && !totosi2) {
      return {
        time: time,
        rs: null,
      };
    } else if (
      new Date(totosi1[0].time).getTime() > new Date(totosi2[0].time).getTime()
    ) {
      setseries(totosi1, 'totosi', getMatchTime(), true);
      setseries(totosi2, 'totosi.it', getMatchTime(), true);
      time = new Date(totosi1[0].time).getTime();
      rs = totosi1;
    } else {
      setseries(totosi1, 'totosi', getMatchTime(), true);
      setseries(totosi2, 'totosi.it', getMatchTime(), true);
      time = new Date(totosi2[0].time).getTime();
      rs = totosi2;
    }
    return {
      time: time,
      rs: rs,
      totosis: [totosi1, totosi2].filter(item => !!item),
    };
  }

  function renderTotosi(
    totosi: OddInfo,
    time: string,
    others: OddInfo[],
    latestOthers: OddInfo[]
  ) {
    // 创建div
    const divDom = document.createElement('div');
    divDom.setAttribute('id', 'myData');
    divDom.style.backgroundColor = '#fff';
    const oddChange = forEachOdd();
    const divWithTitle = `<div style="position:absolute;left:10px;top:40px;z-index:2000;text-align:center;background-color:#fff;color:#1890ff;padding:10px;margin:10px;border-radius:5px;border: 1px solid #1890ff">
<h1>分析</h1>
    <div style="font-size: 18px;text-align: left;">sum: ${oddChange.sum} win: ${
      oddChange.win
    } draw: ${oddChange.draw}  lose: ${oddChange.lose}</div>
    <div style="font-size: 18px;text-align: left;">time: ${time} </div>
    <div style="font-size: 18px;text-align: left;color:#333;">odd: ${
      totosi.odd[0]
    }/${totosi.odd[1]}/${totosi.odd[2]}</div>
    <div>
      <label>Money:</label><input id="myMoney" type="number" value="300"/><button id="calculator">计算</button>   <button id="myBtn">关闭</button>
      <div id="pay" style="height: 40px;line-height:40px;"></div>
    </div>
    <table style="background-color: #fff;
    margin: 10px;
    border: 1px solid;
    border-radius: 5px;
    padding: 0 10px;
    font-size: 18px;
">
        <thead style="height: 30px;
        line-height: 30px;">
        <th width="60">菠菜</th>
            <th width="40">1差</th>
            <th width="40">x差</th>
            <th width="40">2差</th>
            <th width="40">1</th>
            <th width="40">x</th>
            <th width="40">2</th>
            <th width="60">时差</th>
            <th width="120">时间</th>
        </thead>
        <tbody>
        ${renderTable(others)}
        </tbody>
    </table>
    <table style="background-color: #fff;
    margin: 10px;
    border: 1px solid;
    border-radius: 5px;
    padding: 0 10px;
    font-size: 18px;
">
        <thead style="height: 30px;
        line-height: 30px;">
        <th width="60">菠菜</th>
            <th width="40">1差</th>
            <th width="40">x差</th>
            <th width="40">2差</th>
            <th width="40">1</th>
            <th width="40">x</th>
            <th width="40">2</th>
            <th width="60">时差</th>
            <th width="120">时间</th>
        </thead>
        <tbody>
        ${renderTable(latestOthers)}
        </tbody>
    </table>
    <div id="main1" style="width: 100%;height:300px;"></div>
    <div id="mainx" style="width: 100%;height:300px;"></div>
    <div id="main2" style="width: 100%;height:300px;"></div>
</div>`;
    divDom.innerHTML = divWithTitle;
    document.body.append(divDom);
    document.getElementById('calculator').onclick = function() {
      console.log('开始计算');
      const odd = window.odd;
      const money =
        parseFloat(
          (<HTMLInputElement>document.getElementById('myMoney')).value
        ) || 300;
      document.getElementById('pay').innerHTML = `1:${predict(
        money,
        90,
        parseFloat(odd[0]),
        5,
        1.33
      )}\n x:${predict(money, 90, parseFloat(odd[1]), 5, 0.61)}\n 2:${predict(
        money,
        90,
        parseFloat(odd[2]),
        5,
        0.91
      )}`;
    };
    document.getElementById('myBtn').onclick = function() {
      document.getElementById('myData').style.display = 'none';
    };
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
      return '数据错误，请重试！';
    }
  }
  function renderTable(data) {
    let tbody = '';
    const stat = {
      1: 0,
      x: 0,
      2: 0,
    };
    data.forEach(item => {
      if (item.oddx[0] <= 0) {
        stat[1] += 1;
      }
      if (item.oddx[1] <= 0) {
        stat['x'] += 1;
      }
      if (item.oddx[2] <= 0) {
        stat[2] += 1;
      }
      tbody += `<tr style="padding: 5px;font-size:18px;">
      <td style="padding: 5px;font-size:18px;">${item.name}</td>
        <td style="font-size:18px;color:${
          item.oddx[0] > 0 ? '#44b549' : '#333'
        }">${item.oddx[0]}</td>
        <td style="font-size:18px;color:${
          item.oddx[1] > 0 ? '#44b549' : '#333'
        }">${item.oddx[1]}</td>
        <td style="font-size:18px;color:${
          item.oddx[2] > 0 ? '#44b549' : '#333'
        }" >${item.oddx[2]}</td>
        <td style="padding: 5px;font-size:18px;">${item.value.odd[0]}</td>
        <td style="padding: 5px;font-size:18px;">${item.value.odd[1]}</td>
        <td style="padding: 5px;font-size:18px;">${item.value.odd[2]}</td>
        <td style="color:${item.x < 1800 ? 'red' : '#333'}">${resultFormat(
        item.x
      )}</td>
        <td style="padding: 5px;font-size:18px;">${item.value.time}</td>
    </tr>`;
    });
    const sum = `<tr style="font-weight: bold;">
    <td>合计</td>
    <td>${stat[1]}次</td>
    <td>${stat['x']}次</td>
    <td>${stat[2]}次</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
    <td>-</td>
</tr>`;
    return sum + tbody;
  }
  function resultFormat(result) {
    var h = Math.floor((result / 3600) % 24);
    var m = Math.floor((result / 60) % 60);
    if (h < 1) {
      return (result = m + '分钟');
    } else {
      return (result = h + '小时' + m + '分钟');
    }
  }
  function forEachOdd() {
    const odd = {
      win: 0,
      draw: 0,
      lose: 0,
      sum: 0,
    };
    Object.keys(window.hsDetail._hash).forEach(function(item) {
      const temp = window.hsDetail._hash[item].replace(/;/g, '|').split('|');
      if (temp[7]) {
        odd.sum += 1;
        if (parseFloat(temp[7]) - parseFloat(temp[0]) > 0) {
          odd.win += 1;
        }
        if (parseFloat(temp[8]) - parseFloat(temp[1]) > 0) {
          odd.draw += 1;
        }
        if (parseFloat(temp[9]) - parseFloat(temp[2]) > 0) {
          odd.lose += 1;
        }
      }
    });
    return odd;
  }
  function getTimeX(time, t) {
    return Math.round((time - t) / 60000);
  }

  function renderCharts() {
    // 基于准备好的dom，初始化echarts实例
    var myChart1 = echarts.init(<HTMLDivElement>(
      document.getElementById('main1')
    ));
    var myChartx = echarts.init(<HTMLDivElement>(
      document.getElementById('mainx')
    ));
    var myChart2 = echarts.init(<HTMLDivElement>(
      document.getElementById('main2')
    ));
    const baseOption = {
      title: {
        text: '走势',
        x: 'center',
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
        data: legendData,
      },
    } as echarts.EChartOption;
    // 指定图表的配置项和数据
    const option1 = {
      ...baseOption,
      title: { text: '走势1', x: 'center' },
      series: series[1],
    };
    const optionx = {
      ...baseOption,
      title: { text: '走势x', x: 'center' },
      series: series['x'],
    };
    const option2 = {
      ...baseOption,
      title: { text: '走势2', x: 'center' },
      series: series[2],
    };

    // 使用刚指定的配置项和数据显示图表。
    myChart1.setOption(option1);
    myChartx.setOption(optionx);
    myChart2.setOption(option2);
  }

  //获取比赛时间
  function getMatchTime() {
    const temp = window.MatchTime.split(',');

    return (
      new Date(
        `${temp[0]}-${temp[1].substring(0, 2)}-${temp[2]} ${temp[3]}:${temp[4]}`
      ).getTime() + 28800000
    );
  }

  function main() {
    const value = getData(window.game);
    window.odd = value.totosi.odd;
    const others = getCloseOthers(value.other, value.time, value.totosi.odd);
    const latestOthers = getLatestOthers(
      value.other,
      value.time,
      value.totosiSum
    );
    renderTotosi(
      value.totosi,
      new Date(value.time).toLocaleString(),
      others,
      latestOthers
    );
    renderCharts();
  }
  main();
})();
