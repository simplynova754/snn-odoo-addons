from datetime import datetime, time, timedelta

import pytz

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class HrAttendance(models.Model):
    _inherit = "hr.attendance"

    snn_end_reason = fields.Selection(
        [("break", "Break"), ("out", "Clock out")],
        string="Ended by",
        help="How this stretch of work ended at the register: a break or a clock out.",
    )


class HrEmployee(models.Model):
    _inherit = "hr.employee"

    def _snn_day_start_utc(self):
        """Midnight today in the employee's time zone, as naive UTC."""
        tz = pytz.timezone(self.tz or self.env.user.tz or "America/New_York")
        local_midnight = tz.localize(datetime.combine(datetime.now(tz).date(), time.min))
        return local_midnight.astimezone(pytz.utc).replace(tzinfo=None)

    def _snn_clock_state(self):
        self.ensure_one()
        Attendance = self.env["hr.attendance"].sudo()
        now = fields.Datetime.now()
        day_start = self._snn_day_start_utc()
        today = Attendance.search(
            [("employee_id", "=", self.id), ("check_in", ">=", day_start - timedelta(hours=12))],
            order="check_in asc",
        )
        open_att = today.filtered(lambda a: not a.check_out)[:1]
        last = Attendance.search([("employee_id", "=", self.id)], order="check_in desc", limit=1)
        state = "off"
        if open_att:
            state = "on"
        elif last and last.snn_end_reason == "break" and last.check_out and now - last.check_out < timedelta(hours=12):
            state = "break"

        # Start of the current shift: walk back over the stretches split by breaks.
        since = False
        if state in ("on", "break"):
            chain = today.sorted("check_in", reverse=True)
            start = open_att or last
            since = start.check_in
            for att in chain:
                if att.check_in < start.check_in and att.snn_end_reason == "break":
                    since = att.check_in
                    start = att
                elif att.check_in < start.check_in:
                    break

        worked = 0.0
        breaks = 0
        for att in today.filtered(lambda a: a.check_in >= day_start or not a.check_out or a.check_out >= day_start):
            end = att.check_out or now
            worked += max((end - max(att.check_in, day_start)).total_seconds(), 0) / 60.0
            if att.snn_end_reason == "break":
                breaks += 1

        def iso(dt):
            return dt and fields.Datetime.to_string(dt) + "Z"

        return {
            "id": self.id,
            "state": state,
            "since": iso(since),
            "break_since": iso(last.check_out) if state == "break" else False,
            "minutes_today": round(worked),
            "breaks_today": breaks,
        }

    @api.model
    def snn_pos_clock_status(self, employee_ids):
        employees = self.sudo().browse(employee_ids).exists()
        return [emp._snn_clock_state() for emp in employees]

    @api.model
    def snn_pos_clock_action(self, employee_id, pin, action):
        """Clock in / out / break from the register. The PIN is checked here."""
        if not self.env.user.has_group("point_of_sale.group_pos_user"):
            raise UserError(_("Only register users can use the time clock."))
        employee = self.sudo().browse(employee_id).exists()
        if not employee:
            raise UserError(_("Employee not found."))
        if employee.pin and str(pin or "") != employee.pin:
            raise UserError(_("Wrong PIN."))

        Attendance = self.env["hr.attendance"].sudo()
        now = fields.Datetime.now()
        state = employee._snn_clock_state()["state"]
        open_att = Attendance.search(
            [("employee_id", "=", employee.id), ("check_out", "=", False)], limit=1
        )
        last = Attendance.search([("employee_id", "=", employee.id)], order="check_in desc", limit=1)

        if action == "in":
            if state == "on":
                raise UserError(_("%s is already clocked in.", employee.name))
            if state == "break":
                raise UserError(_("%s is on a break. Use End break.", employee.name))
            Attendance.create({"employee_id": employee.id, "check_in": now, "in_mode": "kiosk"})
        elif action == "break_start":
            if state != "on":
                raise UserError(_("%s is not clocked in.", employee.name))
            open_att.write({"check_out": now, "out_mode": "kiosk", "snn_end_reason": "break"})
        elif action == "break_end":
            if state != "break":
                raise UserError(_("%s is not on a break.", employee.name))
            Attendance.create({"employee_id": employee.id, "check_in": now, "in_mode": "kiosk"})
        elif action == "out":
            if state == "on":
                open_att.write({"check_out": now, "out_mode": "kiosk", "snn_end_reason": "out"})
            elif state == "break":
                # Clocking out from a break: the shift ended when the break started.
                last.write({"snn_end_reason": "out"})
            else:
                raise UserError(_("%s is not clocked in.", employee.name))
        else:
            raise UserError(_("Unknown time clock action."))
        return employee._snn_clock_state()
