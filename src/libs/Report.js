const Models = require('../libs/models');
const { Op } = require('sequelize');
const moment = require('moment');
class Report {
  constructor(funcId, functionObj) {
    this.funcId = funcId;
    this.functionObj = functionObj;
  }

  async reportInvoke(handler, status) {
    let data = {
      handler,
      status
    };
    let transaction;
    try {
      transaction = await Models.sequelize.transaction();
      let report = await Models.Report.create({
        type: 'invoke',
        handler,
        data: JSON.stringify(data)
      }, {transaction});
      await report.setFunction(this.functionObj, {transaction});
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e
    }
  }

  async reportSpeed(handler, speed) {
    let data = {
      handler,
      speed,
    };
    let transaction;
    try {
      transaction = await Models.sequelize.transaction();
      let report = await Models.Report.create({
        type: 'speed',
        handler,
        data: JSON.stringify(data)
      }, {transaction});
      await report.setFunction(this.functionObj, {transaction});
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e
    }
  }

  async getReportByDays(startDate, endDate, type) {
    let startDateFormat = startDate.format("YYYY-MM-DD HH:mm:ss");
    let endDateFormat = endDate.format("YYYY-MM-DD HH:mm:ss");
    let reports = await Models.Report.findAll({
      where: {
        FunctionId: this.funcId,
        type: type,
        createdAt: {
          [Op.gte]: startDateFormat,
          [Op.lte]: endDateFormat,
        }
      }
    });
    let res = [];
    let currentDay = startDate.valueOf();
    let lastDay = endDate.endOf('day');
    if (type === 'speed') {
      while (moment(currentDay).isBefore(lastDay)) {
        let currentDayStart = moment(currentDay).startOf('day');
        let currentDayEnd = moment(currentDay).endOf('day');
        let date = moment(currentDay).format("MM-DD");
        let speed = 0;
        let count = 0;
        reports.forEach(item => {
          let date = moment(item.createdAt);
          if (date.isBetween(currentDayStart, currentDayEnd)) {
            let data = JSON.parse(item.data);
            speed += data.speed;
            if (data.speed) count++;
          }
        });
        res.push({
          date,
          averageSpeed: count > 0  ? speed/count : 0,
        });
        currentDay = moment(currentDay).add(1, 'days').valueOf()
      }
    } else {
      while (moment(currentDay).isBefore(lastDay)) {
        let currentDayStart = moment(currentDay).startOf('day');
        let currentDayEnd = moment(currentDay).endOf('day');
        let date = moment(currentDay).format("MM-DD");
        let successCount = 0;
        let failCount = 0;
        reports.forEach(item => {
          let date = moment(item.createdAt);
          if (date.isBetween(currentDayStart, currentDayEnd)) {
            let data = JSON.parse(item.data);
            successCount += !!data.status;
            failCount += !data.status;
          }
        });
        res.push({
          date,
          successCount,
          failCount,
        });
        currentDay = moment(currentDay).add(1, 'days').valueOf()
      }
    }
    return res;
  }

  async getReportTailDays(type, tailDays = 4) {
    let startDate = moment().subtract(tailDays, 'day').startOf('day');
    let endDate = moment().endOf('day');
    return await this.getReportByDays(startDate, endDate, type);
  }

  async getReportByTailWeek(type, tailWeeks = 3) {
    const weekDay = moment().format('E');
    const thisWeekMonday = moment().subtract(+weekDay-1, 'days').startOf('day').valueOf();
    const thisWeekSunday = moment().add(7-weekDay, 'days').endOf('day').valueOf();
    let res = [];
    for (let i = 0; i < tailWeeks; i++) {
      let currentWeekMonday = moment(thisWeekMonday).subtract(i * 7, 'days').startOf('day');
      let currentWeekSunday = moment(thisWeekSunday).subtract(i * 7, 'days').endOf('day');
      let currentWeekMondayFormat = currentWeekMonday.format("MM-DD");
      let currentWeekSundayFormat = currentWeekSunday.format("MM-DD");
      let data = await this.getReportByDays(currentWeekMonday, currentWeekSunday, type);
      if (type === "speed") {
        let sumSpeed = 0;
        let count = 0;
        data.forEach(item => {
          sumSpeed += item.averageSpeed;
          if (item.averageSpeed) count++
        });
        let averageSpeed = count === 0 ? 0 : sumSpeed/count;
        res.push({
          week: `${currentWeekMondayFormat}-${currentWeekSundayFormat}`,
          averageSpeed,
          data,
        })
      } else {
        let sumSuccess = 0;
        let sumFail = 0;
        data.forEach(item => {
          sumSuccess += item.successCount;
          sumFail += item.failCount;
        });
        res.push({
          week: `${currentWeekMondayFormat}~${currentWeekSundayFormat}`,
          sumSuccess,
          sumFail,
          data,
        })
      }
    }
    return res.reverse();
  }
}

module.exports = Report;