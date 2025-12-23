"use client";

import { useMemo, useState, type ChangeEvent } from "react";

type FormState = {
  title: string;
  organizerName: string;
  organizerEmail: string;
  meetingUrl: string;
  date: string;
  time: string;
  duration: number;
  timezone: string;
  agenda: string;
  attendees: string;
  notes: string;
};

type ParsedAttendee = {
  name: string;
  email?: string;
};

const timezoneOptions = [
  { label: "UTC", value: "UTC" },
  { label: "Eastern Time (US & Canada)", value: "America/New_York" },
  { label: "Central Time (US & Canada)", value: "America/Chicago" },
  { label: "Mountain Time (US & Canada)", value: "America/Denver" },
  { label: "Pacific Time (US & Canada)", value: "America/Los_Angeles" },
  { label: "United Kingdom", value: "Europe/London" },
  { label: "Central Europe", value: "Europe/Berlin" },
  { label: "India Standard Time", value: "Asia/Kolkata" },
  { label: "Singapore", value: "Asia/Singapore" },
  { label: "Australia (Sydney)", value: "Australia/Sydney" },
];

const durationOptions = [15, 30, 45, 60, 75, 90, 120];

const createInitialState = (): FormState => {
  const now = new Date();
  const isoDate = now.toISOString();
  const defaultDate = isoDate.split("T")[0] ?? "2024-01-01";
  const defaultTime = isoDate.split("T")[1]?.slice(0, 5) ?? "09:00";

  return {
    title: "Weekly Product Call",
    organizerName: "Taylor Morgan",
    organizerEmail: "taylor@example.com",
    meetingUrl: "https://meet.example.com/product-sync",
    date: defaultDate,
    time: defaultTime,
    duration: 45,
    timezone: "America/New_York",
    agenda:
      "- Share latest sprint highlights\n- Review open blockers\n- Confirm priorities for next iteration",
    attendees:
      "Alex Chen <alex@example.com>\nPriya Singh <priya@example.com>\nJordan Lee <jordan@example.com>",
    notes: "Join a few minutes early for audio checks.",
  };
};

const pad = (value: number) => value.toString().padStart(2, "0");

const formatICSDateUTC = (date: Date) => {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
    date.getUTCSeconds(),
  )}Z`;
};

const formatICSDateLocal = (date: Date) => {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(
    date.getSeconds(),
  )}`;
};

const escapeICS = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const parseAttendees = (value: string): ParsedAttendee[] =>
  value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/<([^>]+)>/);
      if (match) {
        const email = match[1].trim();
        const name = entry.replace(match[0], "").trim();
        return { name: name || email, email };
      }

      if (entry.includes("@")) {
        return { name: entry, email: entry };
      }

      return { name: entry };
    });

const buildICS = (
  form: FormState,
  startDate: Date,
  endDate: Date,
  attendees: ParsedAttendee[],
) => {
  const timestamp = new Date();
  const attendeeLines = attendees
    .filter((attendee) => attendee.email)
    .map(
      (attendee) =>
        `ATTENDEE;CN=${escapeICS(attendee.name)}:MAILTO:${attendee.email}`,
    )
    .join("\n");

  const descriptionLines = [
    form.agenda && `Agenda:\\n${escapeICS(form.agenda)}`,
    form.notes && `Notes:\\n${escapeICS(form.notes)}`,
    form.meetingUrl && `Join:\\n${escapeICS(form.meetingUrl)}`,
  ]
    .filter(Boolean)
    .join("\\n\\n");

  const organizerLine = form.organizerEmail
    ? `ORGANIZER;CN=${escapeICS(form.organizerName || form.organizerEmail)}:MAILTO:${form.organizerEmail}`
    : "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Call Composer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeICS(`${timestamp.getTime()}-${form.title}`)}`,
    `DTSTAMP:${formatICSDateUTC(timestamp)}`,
    `DTSTART;TZID=${form.timezone}:${formatICSDateLocal(startDate)}`,
    `DTEND;TZID=${form.timezone}:${formatICSDateLocal(endDate)}`,
    organizerLine,
    attendeeLines,
    `SUMMARY:${escapeICS(form.title)}`,
    descriptionLines ? `DESCRIPTION:${descriptionLines}` : "",
    form.meetingUrl ? `URL:${escapeICS(form.meetingUrl)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\n");
};

const createClipboardSummary = (
  form: FormState,
  formattedStart: string,
  formattedEnd: string,
  attendees: ParsedAttendee[],
) => {
  const attendeeList = attendees
    .map((attendee) =>
      attendee.email ? `${attendee.name} <${attendee.email}>` : attendee.name,
    )
    .join("\n");

  const summarySections = [
    `${form.title}`,
    `When: ${formattedStart} - ${formattedEnd}`,
    `Host: ${form.organizerName} (${form.organizerEmail})`,
    form.meetingUrl && `Join: ${form.meetingUrl}`,
    attendeeList && `Participants:\n${attendeeList}`,
    form.agenda && `Agenda:\n${form.agenda}`,
    form.notes && `Notes:\n${form.notes}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return summarySections;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim() || "call-invite";

const formatInTimezone = (date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...options,
  }).format(date);

const twoLineFormat = (date: Date, timeZone: string) => ({
  date: formatInTimezone(date, timeZone, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  time: formatInTimezone(date, timeZone, { hour: "numeric", minute: "2-digit" }),
});

export default function Home() {
  const [form, setForm] = useState<FormState>(() => createInitialState());
  const [copied, setCopied] = useState(false);

  const { startDate, endDate, attendees, timezoneLabel, icsContent, clipboardSummary } =
    useMemo(() => {
      const attendeesParsed = parseAttendees(form.attendees);
      const timezoneLabel =
        timezoneOptions.find((option) => option.value === form.timezone)?.label ||
        form.timezone;
      const start = form.date
        ? new Date(`${form.date}T${form.time || "09:00"}:00`)
        : null;
      const end = start ? new Date(start.getTime() + form.duration * 60000) : null;

      if (!start || Number.isNaN(start.getTime()) || !end) {
        return {
          startDate: null,
          endDate: null,
          attendees: attendeesParsed,
          timezoneLabel,
          icsContent: "",
          clipboardSummary: "",
        };
      }

      const formattedStart = new Intl.DateTimeFormat("en-US", {
        timeZone: form.timezone,
        dateStyle: "full",
        timeStyle: "short",
      }).format(start);

      const formattedEnd = new Intl.DateTimeFormat("en-US", {
        timeZone: form.timezone,
        timeStyle: "short",
      }).format(end);

      return {
        startDate: start,
        endDate: end,
        attendees: attendeesParsed,
        timezoneLabel,
        icsContent: buildICS(form, start, end, attendeesParsed),
        clipboardSummary: createClipboardSummary(
          form,
          formattedStart,
          formattedEnd,
          attendeesParsed,
        ),
      };
    }, [form]);

  const displayStart = useMemo(() => {
    if (!startDate) {
      return null;
    }

    const formatted = twoLineFormat(startDate, form.timezone);
    return formatted;
  }, [startDate, form.timezone]);

  const displayEnd = useMemo(() => {
    if (!endDate) {
      return null;
    }

    const formatted = twoLineFormat(endDate, form.timezone);
    return formatted;
  }, [endDate, form.timezone]);

  const handleChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((prev) => ({
        ...prev,
        [field]:
          field === "duration" ? Number.parseInt(value, 10) || prev.duration : value,
      }));
    };

  const handleDurationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    setForm((prev) => ({ ...prev, duration: value }));
  };

  const handleTimezoneChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, timezone: event.target.value }));
  };

  const handleCopy = async () => {
    if (!clipboardSummary) return;

    try {
      await navigator.clipboard.writeText(clipboardSummary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadICS = () => {
    if (!icsContent) return;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(form.title)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const attendeeNames = attendees.map((attendee) => attendee.name).join(", ");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lg:px-12">
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1 text-sm font-medium text-slate-300 shadow-lg shadow-slate-950/60 backdrop-blur">
            Call Composer
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Create a call plan everyone can follow.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Capture the essentials for your next call, share a quick briefing, and
            ship a calendar-ready invite without leaving the browser.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.05fr,1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/40 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Call details</h2>
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-400">
                Live Preview →
              </span>
            </div>

            <form className="mt-6 grid gap-6">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium text-slate-200">
                  Call title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  autoComplete="off"
                  value={form.title}
                  onChange={handleChange("title")}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="Team sync"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    htmlFor="organizerName"
                    className="text-sm font-medium text-slate-200"
                  >
                    Host name
                  </label>
                  <input
                    id="organizerName"
                    type="text"
                    value={form.organizerName}
                    onChange={handleChange("organizerName")}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                    placeholder="Jordan Blake"
                  />
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="organizerEmail"
                    className="text-sm font-medium text-slate-200"
                  >
                    Host email
                  </label>
                  <input
                    id="organizerEmail"
                    type="email"
                    value={form.organizerEmail}
                    onChange={handleChange("organizerEmail")}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                    placeholder="jordan@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-2">
                  <label htmlFor="date" className="text-sm font-medium text-slate-200">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange("date")}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="time" className="text-sm font-medium text-slate-200">
                    Start time
                  </label>
                  <input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={handleChange("time")}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  />
                </div>
                <div className="grid gap-2">
                  <label
                    htmlFor="duration"
                    className="text-sm font-medium text-slate-200"
                  >
                    Duration
                  </label>
                  <select
                    id="duration"
                    value={form.duration}
                    onChange={handleDurationChange}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  >
                    {durationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="timezone"
                  className="text-sm font-medium text-slate-200"
                >
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={form.timezone}
                  onChange={handleTimezoneChange}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                >
                  {timezoneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="meetingUrl"
                  className="text-sm font-medium text-slate-200"
                >
                  Meeting link
                </label>
                <input
                  id="meetingUrl"
                  type="url"
                  value={form.meetingUrl}
                  onChange={handleChange("meetingUrl")}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="https://meet.example.com/call"
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="attendees"
                  className="text-sm font-medium text-slate-200"
                >
                  Participants
                </label>
                <textarea
                  id="attendees"
                  value={form.attendees}
                  onChange={handleChange("attendees")}
                  rows={4}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="Name <email@example.com>"
                />
                <p className="text-xs text-slate-400">
                  List one person per line. Include an email to add them to the
                  calendar invite.
                </p>
              </div>

              <div className="grid gap-2">
                <label htmlFor="agenda" className="text-sm font-medium text-slate-200">
                  Agenda
                </label>
                <textarea
                  id="agenda"
                  value={form.agenda}
                  onChange={handleChange("agenda")}
                  rows={4}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="- Introductions"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="notes" className="text-sm font-medium text-slate-200">
                  Notes for the team
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={handleChange("notes")}
                  rows={3}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="Add quick reminders or prep work"
                />
              </div>
            </form>
          </section>

          <aside className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 shadow-2xl shadow-slate-950/50">
              <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Ready to send
                </span>
                <span className="rounded-full border border-emerald-500/40 px-3 py-0.5 text-xs font-semibold uppercase text-emerald-300">
                  {timezoneLabel}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-white">
                {form.title || "Untitled call"}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Hosted by {form.organizerName || "someone"} ·{" "}
                {form.organizerEmail || "email TBD"}
              </p>

              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/40">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Start
                  </p>
                  <p className="text-base text-slate-200">
                    {displayStart
                      ? `${displayStart.time} · ${displayStart.date}`
                      : "Add date & time"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Finish
                  </p>
                  <p className="text-base text-slate-200">
                    {displayEnd
                      ? `${displayEnd.time} · ${displayEnd.date}`
                      : "Calculated based on duration"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {form.meetingUrl && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    <p className="font-medium text-emerald-100">Join link</p>
                    <p className="break-words text-emerald-200">
                      {form.meetingUrl}
                    </p>
                  </div>
                )}

                {attendeeNames && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Participants
                    </p>
                    <p className="mt-1 text-sm text-slate-300">{attendeeNames}</p>
                  </div>
                )}

                {form.agenda && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Agenda
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-slate-950/40">
                      {form.agenda}
                    </pre>
                  </div>
                )}

                {form.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Notes
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-slate-950/40">
                      {form.notes}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40 backdrop-blur">
              <h4 className="text-lg font-semibold text-white">
                Share briefing & calendar file
              </h4>
              <p className="mt-2 text-sm text-slate-400">
                Copy a quick summary or hand teammates an .ics file ready for any
                calendar tool.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                  disabled={!clipboardSummary}
                >
                  {copied ? "Copied!" : "Copy Summary"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadICS}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-400/50 hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                  disabled={!icsContent}
                >
                  Download .ics
                </button>
              </div>

              <div className="mt-6 grid gap-2">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Calendar file preview
                </p>
                <textarea
                  readOnly
                  value={icsContent}
                  rows={12}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
