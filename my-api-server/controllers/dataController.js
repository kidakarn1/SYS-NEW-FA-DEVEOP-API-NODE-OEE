const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const { DateTime } = require('luxon'); // Use Luxon for date and time operations
const { addAbortSignal } = require('stream');
const getShiftHour = async (req, res) => {
    const { shift } = req.query; // รับพารามิเตอร์จาก URL query string
    let numHour = 0;
    if (shift == 'A'|| shift == 'B' || shift == 'S') {
        numHour = 8;
    } else if (shift == 'P' || shift == 'Q') {
        numHour = 10.5;
    } else {
        numHour = 0;
    }
    res.json({ numHour });
};
const getDefectCode = async (req, res) => {
    const line_cd = req.params.line_cd; // รับพารามิเตอร์จาก URL query string
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT
                                            sys_exp_defect_mst.def_cd AS defect_cd,
                                            sys_exp_defect_mst.def_name_en AS defect_name,
                                            *
                                        FROM
                                            sys_line_mst
                                        LEFT JOIN sys_department ON sys_line_mst.line_cd = ${line_cd}
                                        AND sys_line_mst.dep_cd = sys_department.sec_name
                                        LEFT JOIN permission_defect ON sys_department.dep_id = permission_defect.dep_id
                                        AND sys_line_mst.line_id = permission_defect.line_cd
                                        LEFT JOIN sys_exp_defect_mst ON permission_defect.def_id = sys_exp_defect_mst.def_id
                                        WHERE
                                        sys_line_mst.line_cd = ${line_cd}
                                        AND sys_line_mst.enable = '1'
                                        AND sys_department.enable = '1'
                                        AND permission_defect.enable = '1' 
                                        ORDER BY
                                            sys_exp_defect_mst.def_cd 
                                        ASC`;
        res.json(result.recordset);
    } catch (err) {
        console.error('EEROR Function getDefectCode Database query error:', err);
        res.status(500).send('Internal Server Error');
    } finally {
        // sql.close();
    }
};
const GET_HOUR = async (req, res) => {
    try {
        const { shift } = req.query; // รับพารามิเตอร์จาก URL query string
        const shift_times = {
            'A': { start: '08:00', end: '17:00' },
            'B': { start: '20:00', end: '05:00' },
            'P': { start: '08:00', end: '20:00' },
            'Q': { start: '20:00', end: '08:00' },
            'S': { start: '20:00', end: '05:00' },
            'M': { start: '17:00', end: '20:00' },
            'N': { start: '05:00', end: '08:00' }
        };
        if (!shift_times[shift]) {
            return "Invalid shift";
        }
        const startTime = new Date(`2000-01-01T${shift_times[shift]['start']}`);
        let endTime = new Date(`2000-01-01T${shift_times[shift]['end']}`);
        // Handle shifts that span across midnight
        if (startTime > endTime) {
            endTime.setDate(endTime.getDate() + 1); // Add 1 day to end time
        }
        let durationMs = endTime - startTime;
        let durationHours = durationMs / (1000 * 60 * 60); // Convert milliseconds to hours
        // Adjust hours based on shift type
        if (shift === 'P' || shift === 'Q') {
            durationHours -= 1.5; // Subtract 1.5 hours for shifts P and Q
        } else if (shift === 'A' || shift === 'B') {
            durationHours -= 1.0; // Subtract 1.0 hour for shifts A and B
        }
        // Round to two decimal places
        durationHours = Math.round(durationHours * 100) / 100;
        var  data = {
            WorkHour: durationHours
          };
        // Convert to JSON format
        // console.log(durationHours)
        res.json(data);
        return JSON.stringify(data);
    }catch(err){
        console.error('EEROR Function GET_HOUR  = :', err);
    }
};
const EXP_CHECK_SUPP = async (req, res) => {
    const item_cd = req.params.item_cd; // รับพารามิเตอร์จาก URL query string
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`SELECT
				IT.PLANT_CD,
				IT.ITEM_CD,
				SC.SOURCE_CD,
				SC.SOURCE_NAME,
				IT.OUTSIDE_TYP --1=Internal, 2=External
				FROM
				M_PLANT_ITEM IT,
				M_SOURCE SC
				
				WHERE
				IT.ITEM_CD = SC.ITEM_CD (+)
				AND IT.ITEM_CD = '{$item_cd}'
				AND TO_CHAR( SC.EFF_PHASE_OUT_DATE, 'YYYY/MM/DD' ) >= TO_CHAR( SYSDATE-1 , 'YYYY/MM/DD' )
				ORDER BY IT.PLANT_CD, IT.ITEM_CD, SC.SOURCE_CD ASC`;
        res.json(result.recordset);
    } catch(err) {
        console.error('ERROR Function EXP_CHECK_SUPP  = ', err);
        res.status(500).send('Internal Server Error');
    } finally {
        // sql.close();
    }
};
const NEW_GET_TARGET = async (req, res) => {
    try{
        // console.log(req);
        const { st_shift, end_shift, std_ct , date_start ,date_end } = req.query;
        const { DateTime, Duration } = require('luxon');
        const now = DateTime.now();
        // console.log(now);
        // Get the current hour in 24-hour format
        // const timeCurr = now.toFormat('HH');
        // Define start date and end date/time
        let dateTime_start = date_start + " " + st_shift + ":00";//DateTime.now().toFormat('yyyy-MM-dd') + ' ' + st_shift + ':00';
        let dateTime_End = date_end  + " " + end_shift + ":00";//DateTime.now().toFormat('yyyy-MM-dd') + ' ' + end_shift + ':00';
        // console.log("NEW_GET_TARGET dateTime_start ===>" + dateTime_start)
        // console.log("NEW_GET_TARGET dateTime_End ===>" + dateTime_End)
        // Adjust start date if the current time is between 00:00 and 07:00 (for night shifts)
        // if (timeCurr >= 0 && timeCurr <= 7) {
        //     date_start = DateTime.fromFormat(date_start, 'yyyy-MM-dd HH:mm:ss')
        //         .minus({ days: 1 })
        //         .toFormat('yyyy-MM-dd') + ' ' + st_shift + ':00';
        // }else{
        //     if (st_shift == '08:00') {
        //     }else{
        //         dateTimeEnd = DateTime.fromFormat(dateTimeEnd, 'yyyy-MM-dd HH:mm:ss')
        //         .plus({ days: 1 })
        //         .toFormat('yyyy-MM-dd') + ' ' + end_shift + ':00';
        //     }
        // }
        const diffdatesec = DateTime.fromFormat(dateTime_End, 'yyyy-MM-dd HH:mm:ss')
            .diff(DateTime.fromFormat(dateTime_start, 'yyyy-MM-dd HH:mm:ss'), 'seconds')
            .seconds;
        let breakTime = 60;
        // Adjust break time if the shift starts at "20:00" or "08:00"
        if (end_shift == '20:00' || end_shift == '08:00') {
            breakTime += 30;
        }
        const resultsec = diffdatesec - (breakTime * 60);
        // Calculate work hours based on standard conversion time (std_ct)
        var rs = Math.floor(resultsec / std_ct);
        // Prepare response data in JSON format
        const data = {
            Target: rs
        };
        // Send JSON response
        res.json(data);
    }catch (err){
        console.error('ERROR Function NEW_GET_TARGET = ', err);
    }
};
const GetLossByHouse = async (req, res) => {
    const { line_cd , date_start , date_end , time_crr , convertnewDateMinutes } = req.query;
    try {
        // const { DateTime, Duration } = require('luxon');
        // const now = DateTime.now();
        // const date = new Date();
        // const date1 = new Date(date);
        var dateTimeCrr = date_end + " " + time_crr
        // console.log("convertnewDateMinutes ===>" + convertnewDateMinutes)

        // var date1 = new Date(dateTimeCrr);
        // Subtract 60 minutes from the Date object
        //   date1.setMinutes(date1.getMinutes() - 60);
        // const datebefore = date1.toISOString().slice(0, 19).replace('T', ' ');
        // console.log("datebefore =====>" + datebefore);
        // const dateTimeEnd = date.toISOString().slice(0, 19).replace('T', ' ');
        await sql.connect(dbConfig);
        const result = await sql.query`
        SELECT 
            COALESCE(SUM(loss_time), 0) AS TotalLoss 
        FROM
            loss_actual 
        WHERE
            loss_cd_id = '35' 
            AND line_cd = ${line_cd}
            AND end_loss BETWEEN ${convertnewDateMinutes} AND ${dateTimeCrr}
        `;
        // console.log("dateTimeCrr===>" + dateTimeCrr)
        // console.log("dateTimeCrr===>" + dateTimeCrr)
        res.json(result.recordset);
    } catch (err) {
        console.error("ERROR Function GetLossByHouse =" ,err);
        res.status(500).send('ERROR Function GetLossByHouse = ', err);
    }finally {
        // sql.close();
    };
}
const dateDiffInSeconds = (date1, date2) => {
    try{
        const diffInMs = new Date(date2) - new Date(date1);
        return diffInMs / 1000;
    }catch (err){
        console.error("ERROR Function dateDiffInSeconds =" ,err);
    }
   
};
function dateDiff(date1, date2) {
    // Parse input dates into JavaScript Date objects
    const datetime1 = new Date(date1);
    const datetime2 = new Date(date2);
    // Calculate the difference in milliseconds
    let diff = Math.abs(datetime2 - datetime1);
    // Calculate various time units
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30); // Rough approximation
    const years = Math.floor(months / 12); // Rough approximation
    // Return the difference as an object
    return {
        years: years,
        months: months,
        days: days,
        hours: hours % 24,
        minutes: minutes % 60,
        seconds: seconds % 60,
        total_days: days,
        formatted: `${years} years, ${months} months, ${days} days, ${hours % 24} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`
    };
}
const progressbarA = async (req, res) => {
    try{
        const querystring = require('querystring');
        const { st_shift, end_shift, line_cd  , date_start , date_Crr , TimeCrr} = req.query;
        const { DateTime, Duration } = require('luxon');
        const now = DateTime.now();
        const timeCurr = new Date().getHours();
        let dateTimestart = date_start+" " +st_shift+":00";
        let dateTimeEnd =   date_Crr+" "+TimeCrr//DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss') //new Date().toISOString().slice(0, 10) + ` ${end_shift}:00`;
        // if (timeCurr >= 0 && timeCurr <= 7) {
        //     date_start = new Date(new Date(date_start).getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + ` ${st_shift}:00`;
        // }
        // if (st_shift === "20:00") {
        //     dateTimeEnd = new Date(new Date(dateTimeEnd).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + ` ${end_shift}:00`;
        // }
        // console.log("progressbarA  ===>dateTimestart===>" + dateTimestart)
        // console.log("progressbarA  ===>dateTimeEnd===>" + dateTimeEnd)
        let diffdatesec = dateDiffInSeconds(dateTimestart, dateTimeEnd);
        // console.log("diffdatesec ==>" + diffdatesec)
        let breakTime = 20;
        let lunch = 0;
        let Dinnerbrak = 0;
        if (timeCurr >= 12 || timeCurr >= 24) {
            lunch = 40;
        }
        if (end_shift === "20:00" || end_shift === "08:00") {
            if (timeCurr >= 12 || timeCurr >= 24) {
                Dinnerbrak = 30;
            }
        }
        let Allbreak = breakTime + lunch + Dinnerbrak;
        let diffdatemin = (diffdatesec / 60) - Allbreak;
        try {
        await sql.connect(dbConfig);
              const result = await sql.query`
                SELECT COALESCE(SUM(loss_time), 0) as totalLoss
                FROM loss_actual AS la
                JOIN sys_loss_mst AS slm ON la.loss_cd_id = slm.id
                WHERE la.line_cd = ${line_cd}
                AND la.start_loss BETWEEN ${dateTimestart} AND ${dateTimeEnd}
                AND (slm.loss_cd = 'A' OR slm.loss_cd = 'B' OR slm.loss_cd = 'T' OR slm.loss_cd = 'D' OR slm.loss_cd = 'P1')
            `;
            // Execute SQL query using your Node.js database library (e.g., MySQL, PostgreSQL)
        // Example output calculation
        // console.log("progressbarA  result.recordset[0].totalLoss ====>" + result.recordset[0].totalLoss)
        const loadingTime = diffdatemin - result.recordset[0].totalLoss; // Assuming 'totalLoss' is fetched from SQL query
        // console.log("loadingTime222==>" + loadingTime)
         const result2 = await sql.query `SELECT
            COALESCE(SUM(loss_time), 0) as totalLoss 
            FROM
            loss_actual AS la,
            sys_loss_mst AS slm 
            WHERE
            la.line_cd= ${line_cd}
            AND la.start_loss BETWEEN ${dateTimestart}
            AND ${dateTimeEnd}
            AND la.loss_cd_id = slm.id
            AND (slm.loss_cd != 'A' AND slm.loss_cd != 'B' AND slm.loss_cd != 'T' AND slm.loss_cd != 'D' AND slm.loss_cd != 'P1' AND slm.loss_cd != 'X')`;
            // Execute SQL query for sqlremain
        // Example remaining calculations
        const OperatingTime = loadingTime - result2.recordset[0].totalLoss;
        var rs = Math.floor((OperatingTime / loadingTime) * 100);
        // console.log("loadingTime ====> " + loadingTime)
        // console.log("OperatingTime ====> " + OperatingTime)
        // console.log("result2.recordset[0].totalLoss ===>" + result2.recordset[0].totalLoss)
        // console.log(rs);
        res.json({ PercentA : `${rs}` });
        return 0 
        }catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }finally {
            // sql.close();
        };
        // res.json(rs);
    }catch(err){
        console.error("ERROR Function dateDiffInSeconds =" ,err);
    }
    
};
const GetDataAvailabillty = async (req, res) => {
    const { line_cd , lot_no , shift , dateStart ,dateEnd ,st_shift , end_shift } = req.query;
    const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });
    await sql.connect(dbConfig);
    try {
        // const { DateTime, Duration } = require('luxon');
        //  const now = DateTime.now();
        //  const timeCurr = now.toFormat('HH:mm:ss');
        // let start_date;
        // const [rs_shift] = await Get_time_start_shift(shift);
        // const dateStr = rs_shift.master_start_shift;
        // const dateObj = new Date(dateStr);
        // const timeStr = dateObj.toISOString().substring(11, 16);
        // var masterStartShift = now.toFormat('yyyy-MM-dd') + " " + timeStr
        // if (timeNow >= "00:00:00" && timeNow <= "07:59:59") {
        //     const delDate = now.minus({ days: 1 });
        //     start_date =  delDate + " " + timeStr
        // } else {
        //     start_date = masterStartShift
        // }

        // const end_date =  now.toFormat('yyyy-MM-dd HH:mm:ss')
        var start_dateTime = dateStart + " " + st_shift
        var end_dateTime = dateEnd + " " + end_shift
        // console.log("start_dateTime===>" + start_dateTime)
        // console.log("end_dateTime===>" + end_dateTime)
        // console.log("st_shift ====>" + st_shift)
        // console.log("end_shift ====>" + end_shift)
        // console.log("timeCurr ====>" + timeCurr)
        await sql.connect(dbConfig);
        const result = await sql.query`
        SELECT TOP 3 slm.loss_cd,
                    SUM(la.loss_time) AS lossTime,
                    (SELECT SUM(la2.loss_time)
                        FROM loss_actual AS la2
                                INNER JOIN production_working_info AS pwi2 ON pwi2.pwi_id = la2.pwi_id
                        WHERE pwi2.pwi_lot_no = ${lot_no}
                        AND la2.line_cd = ${line_cd}
                        AND la2.start_loss BETWEEN ${start_dateTime} AND ${end_dateTime}
                        AND la2.loss_cd_id != '36'
                        AND la2.loss_cd_id != '35') AS AllLossTime
        FROM loss_actual AS la,
            production_working_info AS pwi,
            sys_loss_mst AS slm
        WHERE pwi.pwi_lot_no = ${lot_no}
            AND pwi.pwi_id = la.pwi_id
            AND la.line_cd = ${line_cd}
            AND la.loss_cd_id = slm.id
            AND la.start_loss BETWEEN ${start_dateTime} AND ${end_dateTime}
            AND la.loss_cd_id != '36'
            AND la.loss_cd_id != '35'
        GROUP BY slm.loss_cd
        ORDER BY SUM(la.loss_time) DESC`;
        // console.log("masterStartShift ====>" + masterStartShift)
        // return 0;
        const rs = result.recordset;
        res.json(rs);
        return 0
        } catch (error) {
            console.error('Error Function GetDataAvailabillty = ', error);
            res.status(500).send('Internal Server Error');
        } finally {
            // sql.close();
        }
};
async function Get_time_start_shift(shift) {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query`EXEC [dbo].[GET_DATA_SHIFT] @shift = ${shift}`;
        return result.recordset; // Returns an array of records
      } catch (err) {
        console.error('Error Function Get_time_start_shift = ', err);
        throw err;
      } finally {
        // sql.close();
      }
}
const getAccTarget = async (req, res) => {
    try {
        const { DateTime, Duration } = require('luxon');
        const {st_shift , std_ct , dateStart ,  dateEnd , end_shift} = req.query;
        // console.log(st_shift)
        // console.log(std_ct)
        // const now = DateTime.now();
        // Parse query parameters
        // Get the current hour
        const timeCurr = new Date().getHours();
        // Define start date and current date/time
        const currentDate = new Date();
        let date_start =   dateStart + " " + st_shift + ":00";
        let dateTimeCurr = dateEnd  + " " + end_shift;
        // console.log("getAccTarget date_start===>" + date_start);
        // console.log("getAccTarget dateTimeCurr===>" + dateTimeCurr);
        // Adjust start date if the current time is between 0 and 7 (for night shifts)
        // console.log(timeCurr)
        // if (timeCurr >= 0 && timeCurr <= 7) {
        //     console.log("ASD")
        //     date_start = now.minus({ days: 1 }).toFormat('yyyy-MM-dd') + ` ${st_shift}:00`;
        //     // const delDate = now.minus({ days: 1 });
        //     // date_start =  delDate + " " + st_shift
        // }
        // Calculate the difference between the start date and current date/time
        // console.log(date_start)
        // console.log(dateTimeCurr)
        const diffdatesec = dateDiffInSeconds(date_start, dateTimeCurr);
        // Calculate and send the result
        var results = (diffdatesec / std_ct).toFixed(0);
        res.json({ ActualTarget: results});
      } catch (err) {
        console.error('Error Function getAccTarget = ', err);
        res.status(500).send('Internal Server Error');
      }
};
async function getProductiontime(st_shift , date_crr , time_crr) {
    try{
        const { DateTime, Duration } = require('luxon');
        const now = DateTime.now();
        timeCurr = now.toFormat('H');
        // Define start date and current date/time
        var date_start = date_crr+ " " +st_shift + ":00";
        var dateTimeCurr = date_crr + " " + time_crr; //now.toFormat('yyyy-MM-dd H:ii:s');
        var currentHourNoLeadingZero = "";//ltrim($dateTimeCurr, '0');
        if (currentHourNoLeadingZero === '') {
            currentHourNoLeadingZero = '0';
        }
        // if (parseInt(currentHourNoLeadingZero, 10) > 0 && parseInt(currentHourNoLeadingZero, 10) < 7) {
        //     date_start = now.minus({ days: 1 }).toFormat('yyyy-MM-dd') + ` ${st_shift}:00`;
        // }
        // console.log("date_start===>" + date_start)
        // console.log("dateTimeCurr===>" + dateTimeCurr)
        // Calculate the difference between the start date and current date/time
        const diffdatesec = dateDiffInSeconds(date_start, dateTimeCurr);
        // console.log("diffdatesec===>" ,  diffdatesec)
        // Return the difference in seconds as an integer
        var rs = parseInt(diffdatesec, 10)
        return rs
    }catch(err){
        console.log("ERROR FUNCTION getProductiontime = " , err)
    }
};
async function getSpeedLoss(req, res) {
    // Retrieve GET parameters and ensure they are numeric
    try{
        const {NG , Good , Timeshift, std_cd} = req.query;
        const NGValue = NG ? parseFloat(NG) : 0;
        const GoodValue = Good ? parseFloat(Good) : 0;
        const std_cdValue = std_cd ? parseFloat(std_cd) : 0;
        // Ensure standard cycle time is not zero to avoid division by zero
        if (std_cdValue === 0) {
            return "Error: Standard cycle time (std_cd) must not be zero.";
        }
        // Get production time
        const prod_time = await getProductiontime(Timeshift);
        // console.log("speedLoss===>" + prod_time)
        // Ensure production time is valid
        if (prod_time <= 0) {
            return "Error: Production time must be a positive number.";
        }
        // Calculate total units produced
        const totalUnits = (GoodValue + NGValue) * 100;
        // Calculate the production time adjusted by the standard cycle time
        const cal_prod_time_stdct = prod_time / std_cd;
        // Calculate Speed Loss
        const speedLoss = totalUnits / cal_prod_time_stdct;
        // Return the Speed Loss as an integer
        res.json({ speedLoss: Math.round(speedLoss)});
        return Math.round(speedLoss);
    }catch(err){
        console.log("ERROR FUNCTION getSpeedLoss = " , err)
    }
}
async function getDateTimeStart(req, res) {
    try {
        const { st_shift, line_cd , date_start , dateCurr , TimeCurr } = req.query;
        const now = DateTime.now();
        let dateStart = date_start + " " + st_shift + ":00";
        // const timeCurr = now.toFormat('H');
        // if (timeCurr > 0 && timeCurr < 7) {
        //     dateStart = now.minus({ days: 1 }).toFormat('yyyy-MM-dd') + ` ${st_shift}:00:00`;
        // }
        const dateTimeCurr = dateCurr + " " + TimeCurr;//now.toFormat('yyyy-MM-dd HH:mm:ss');
        // console.log("getDateTimeStart dateStart===>" + dateStart)
        // console.log("getDateTimeStart dateTimeCurr===>" + dateTimeCurr)
        const maxRetries = 3;
        let attempts = 0;
        let result;
        while (attempts < maxRetries) {
            try {
                await sql.connect(dbConfig);
                // console.log(`
                //     SELECT ISNULL(
                //         (SELECT TOP 1 st_time 
                //          FROM production_actual_detail 
                //          WHERE st_time BETWEEN '${dateStart}' AND '${dateTimeCurr}'
                //            AND line_cd = '${line_cd}'
                //          ORDER BY id ASC), 
                //         GETDATE()
                //     ) AS result_time;
                // `);
                result = await sql.query`
                    SELECT ISNULL(
                        (SELECT TOP 1 st_time 
                         FROM production_actual_detail 
                         WHERE st_time BETWEEN ${dateStart} AND ${dateTimeCurr}
                           AND line_cd = ${line_cd}
                         ORDER BY id ASC), 
                        GETDATE()
                    ) AS result_time;
                `;
                // console.log(`
                //     SELECT ISNULL(
                //         (SELECT TOP 1 st_time 
                //          FROM production_actual_detail 
                //          WHERE st_time BETWEEN ${dateStart} AND ${dateTimeCurr}
                //            AND line_cd = ${line_cd}
                //          ORDER BY id ASC), 
                //         GETDATE()
                //     ) AS result_time;
                // `)
                break; // Break the loop if the query is successful
            } catch (err) {
                console.error('Error executing SQL query:', err);
                attempts++;
                if (attempts >= maxRetries) {
                    throw new Error('Max retries reached');
                }
                console.log(`Retrying query... (${attempts}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 3 seconds before retrying
            } finally {
                // await sql.close(); // Ensure the connection is closed
            }
        }
        // console.log("result.recordset[0]===>" , result.recordset[0])
        const isoString = result.recordset[0].result_time.toISOString();
        const dt = DateTime.fromISO(isoString, { zone: 'utc' });
        const formattedDateTime = dt.toFormat('yyyy-MM-dd HH:mm:ss');
        const data = { formattedDateTime: formattedDateTime };
        res.json(data);
        // console.log(data);
    } catch (err) {
        console.log("ERROR FUNCTION getDateTimeStart = " , err)
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
async function getProduction_actual_detailByHour(req, res) {
    try {
        const { line_cd ,date_crr , time_crr ,  convertnewDateMinutes } = req.query;
 
        const date = DateTime.now();
        const datebefore = convertnewDateMinutes
        const dateCrr = date_crr + " " + time_crr;
        // console.log("datebefore ====>" + datebefore)
        // console.log("dateCrr ====>" + dateCrr)
        // SQL query to fetch total quantity by hour
         await sql.connect(dbConfig);
         const result = await sql.query`SELECT COALESCE(SUM(qty), 0) AS TotalByHour
                     FROM production_actual_detail
                     WHERE line_cd = ${line_cd} AND st_time BETWEEN ${datebefore} AND ${dateCrr}`;
    //   console.log(`SELECT COALESCE(SUM(qty), 0) AS TotalByHour
    //                  FROM production_actual_detail
    //                  WHERE line_cd = ${line_cd} AND st_time BETWEEN ${datebefore} AND ${dateCrr}`)
                     res.json(result.recordset[0]);
      } catch (err) {
        console.log("ERROR FUNCTION getProduction_actual_detailByHour = " , err)
        throw err;
      } finally {
        // sql.close();
      }
}

async function getProduction_actual_detailByShift(req, res) {
    try {
        const { line_cd ,date_start , date_end ,  st_shift , end_shift } = req.query;
 
        const date = DateTime.now();
        const dateTimestart = date_start + " " + st_shift
        const dateTimeend =  date_end + " " + end_shift
         await sql.connect(dbConfig);
         const result = await sql.query`SELECT COALESCE(SUM(qty), 0) AS TotalActualDetail
                     FROM production_actual_detail
                     WHERE line_cd = ${line_cd} AND st_time BETWEEN ${dateTimestart} AND ${dateTimeend}`;
    //   console.log(`SELECT COALESCE(SUM(qty), 0) AS TotalActualDetail
    //                  FROM production_actual_detail
    //                  WHERE line_cd = ${line_cd} AND st_time BETWEEN ${dateTimestart} AND ${dateTimeend}`)
                     res.json(result.recordset[0]);
      } catch (err) {
        console.log("ERROR FUNCTION getProduction_actual_detailByShift = " , err)
        throw err;
      } finally {
        // sql.close();
      }
}
async function GetStd_job(req, res) {
    try{
        const { shift_plan, shift_qty } = req.query;
        const rs = Math.floor(parseInt(shift_plan) / parseInt(shift_qty));
        var  data = {
            rs: rs
          };
        res.json(data);
    }catch(err){
        console.log("ERROR FUNCTION GetStd_job = " , err)
    }
}
async function GetActualPerformance(qty_working, working_time) {
 // Convert inputs to numbers (assuming they are strings from HTTP GET query)
 try{
    qty_working = parseInt(qty_working);
    working_time = parseInt(working_time);
    // Perform the calculation and return the result
    return Math.floor(qty_working / working_time);
 }catch(err){
    console.log("ERROR FUNCTION GetActualPerformance = " , err)
 }
}
async function GetWorkingTime(req, res) {
    try {
        const {line_cd ,st_shift,date_crr,time_crr,dates_start } = req.query;
        const now = DateTime.now();
        var date_start = dates_start+ " " +st_shift+":00";
        var dateTimeCurr = date_crr + " "+time_crr;
        // console.log("GetWorkingTime date_start====>" + date_start)
        // console.log("GetWorkingTime dateTimeCurr====>" + dateTimeCurr)
        await sql.connect(dbConfig);
        const result = await sql.query`Select sum(loss_time) / 60 as loss_hour from loss_actual where start_loss between ${date_start} and ${dateTimeCurr} and flg_control = '1' AND line_cd = ${line_cd}`;
        // console.log(`Select sum(loss_time) / 60 as loss_hour from loss_actual where start_loss between ${date_start} and ${dateTimeCurr} and flg_control = '1' AND line_cd = ${line_cd}`)
        // return 0 
        var rs = 0
        // if(result.recordset[0].loss_hour > 0){
            var productionTime = dateDiffInSeconds(date_start, dateTimeCurr);
            var productionTimemin = productionTime / 60;
            var productionTimehour = productionTimemin / 60;
            rs = productionTimehour - result.recordset[0].loss_hour
        // } 
        var  data = {
            rs: rs.toString()
          };
        // console.log(`Select sum(loss_time) / 60 as loss_hour from loss_actual where start_loss between ${date_start} and ${dateTimeCurr} and flg_control = '1' AND line_cd = ${line_cd}`)
        res.json(data);
        // console.log(data)
        return data;
      } catch (err) {
            console.error('ERROR FUNCTION GetWorkingTime = ', err);
            throw err;
      } finally {
        // sql.close();
      }
   }
module.exports = {
    getShiftHour,
    getDefectCode,
    GET_HOUR,
    NEW_GET_TARGET,
    GetLossByHouse,
    progressbarA,
    GetDataAvailabillty,
    getAccTarget,
    getSpeedLoss,
    getDateTimeStart,
    getProduction_actual_detailByHour,
    getProduction_actual_detailByShift,
    GetStd_job,
    GetActualPerformance,
    GetWorkingTime
};