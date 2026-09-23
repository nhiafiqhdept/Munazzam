import React from 'react';

export interface GenerateReportParams {
  name: string;
  date?: string;
  time?: string;
  place?: string;
  audience?: string;
  resourcePerson?: string;
  category?: string;
}

/**
 * Formats a date string (e.g. "2026-09-23") into a clean readable date ("23 September 2026").
 */
export function formatReportDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (month >= 1 && month <= 12 && !isNaN(day) && !isNaN(year)) {
      return `${day} ${months[month - 1]} ${year}`;
    }
  }
  return trimmed;
}

/**
 * Formats a time string (e.g. "19:00" -> "07:00 PM", or keeps existing formatted strings like "07:00 PM – 09:00 PM").
 */
export function formatReportTime(timeStr: string): string {
  if (!timeStr || !timeStr.trim()) return '';
  const trimmed = timeStr.trim();

  // If 24-hour single time format e.g. "19:00"
  const singleMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (singleMatch) {
    let hours = parseInt(singleMatch[1], 10);
    const minutes = singleMatch[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${strHours}:${minutes} ${ampm}`;
  }

  return trimmed;
}

/**
 * Generates a short, professional, single-sentence academic description
 * strictly derived from the Program Name and audience, without inventing facts or extra sections.
 */
function generateShortDescription(name: string, audience?: string, _category?: string): string {
  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  const lowerAud = (audience || '').toLowerCase();

  const audienceTarget = lowerAud.includes('student')
    ? 'students'
    : lowerAud.includes('member')
    ? 'members'
    : lowerAud.includes('faculty') || lowerAud.includes('staff') || lowerAud.includes('teacher')
    ? 'faculty and participants'
    : lowerAud.includes('public') || lowerAud.includes('general')
    ? 'attendees'
    : 'participants';

  // Specific Islamic / Classical Academic titles (like "Mafātīḥ al-Ibāra")
  if (
    lowerName.includes('ibāra') ||
    lowerName.includes('ibarah') ||
    lowerName.includes('fiqh') ||
    lowerName.includes('usul') ||
    lowerName.includes('usuul') ||
    lowerName.includes('shar') ||
    lowerName.includes('fatwa') ||
    lowerName.includes('qawaid') ||
    lowerName.includes('faraid') ||
    lowerName.includes('muamalat')
  ) {
    return `A specialized academic session exploring the principles and practical understanding of ${cleanName}, designed to enhance ${audienceTarget}’ comprehension of classical Islamic legal texts.`;
  }

  if (
    lowerName.includes('tafsir') ||
    lowerName.includes('quran') ||
    lowerName.includes('qur\'an') ||
    lowerName.includes('hifz') ||
    lowerName.includes('tajweed') ||
    lowerName.includes('tilawah')
  ) {
    return `A dedicated academic session centered on ${cleanName}, designed to enrich ${audienceTarget}’ understanding and appreciation of Quranic sciences.`;
  }

  if (
    lowerName.includes('hadith') ||
    lowerName.includes('hadeeth') ||
    lowerName.includes('sunnah') ||
    lowerName.includes('seerah') ||
    lowerName.includes('sirah')
  ) {
    return `A scholarly academic session dedicated to the study and contextual appreciation of ${cleanName}, fostering deeper knowledge among ${audienceTarget}.`;
  }

  if (
    lowerName.includes('arabic') ||
    lowerName.includes('nahw') ||
    lowerName.includes('sarf') ||
    lowerName.includes('balagha') ||
    lowerName.includes('adab') ||
    lowerName.includes('lisan')
  ) {
    return `A focused academic study session exploring ${cleanName}, structured to advance ${audienceTarget}’ proficiency and analytical understanding of classical Arabic language and literature.`;
  }

  // Workshops
  if (lowerName.includes('workshop')) {
    return `An interactive educational workshop focusing on ${cleanName}, structured to provide ${audienceTarget} with practical knowledge, actionable skills, and systematic guidance.`;
  }

  // Seminars
  if (lowerName.includes('seminar')) {
    return `A focused academic seminar exploring the core themes and practical dimensions of ${cleanName}, structured to facilitate scholarly discourse and conceptual clarity for ${audienceTarget}.`;
  }

  // Symposium / Colloquium
  if (lowerName.includes('symposium') || lowerName.includes('colloquium')) {
    return `A scholarly academic symposium examining key perspectives and deliberations on ${cleanName}, encouraging collaborative intellectual exchange among ${audienceTarget}.`;
  }

  // Lecture / Talk
  if (lowerName.includes('lecture') || lowerName.includes('talk') || lowerName.includes('keynote')) {
    return `An insightful academic lecture delivering comprehensive perspectives on ${cleanName}, facilitating conceptual clarity and disciplined learning for ${audienceTarget}.`;
  }

  // Conference / Conclave
  if (lowerName.includes('conference') || lowerName.includes('conclave') || lowerName.includes('convention')) {
    return `A formal academic conference convened around ${cleanName}, bringing ${audienceTarget} together for structured discourse, learning, and collaborative deliberation.`;
  }

  // Competition / Contest / Quiz
  if (
    lowerName.includes('competition') ||
    lowerName.includes('contest') ||
    lowerName.includes('quiz') ||
    lowerName.includes('fest') ||
    lowerName.includes('championship')
  ) {
    return `A competitive academic and skill-building initiative conducted around ${cleanName}, encouraging intellectual rigor, active participation, and excellence among ${audienceTarget}.`;
  }

  // Orientation / Induction
  if (lowerName.includes('orientation') || lowerName.includes('induction') || lowerName.includes('briefing')) {
    return `An orientation session introducing ${audienceTarget} to the framework, objectives, and foundational aspects of ${cleanName}.`;
  }

  // Training / Bootcamp / Camp
  if (lowerName.includes('training') || lowerName.includes('bootcamp') || lowerName.includes('camp')) {
    return `An intensive training program designed to equip ${audienceTarget} with systematic understanding and practical competence in ${cleanName}.`;
  }

  // Exhibition / Expo
  if (lowerName.includes('exhibition') || lowerName.includes('expo') || lowerName.includes('display')) {
    return `A curated educational exhibition presenting informative academic displays and resources on ${cleanName} for ${audienceTarget}.`;
  }

  // Assembly / Meeting / Discussion / Council
  if (
    lowerName.includes('meeting') ||
    lowerName.includes('assembly') ||
    lowerName.includes('council') ||
    lowerName.includes('dialogue') ||
    lowerName.includes('discussion')
  ) {
    return `A structured session convened around ${cleanName}, facilitating organized deliberation and active engagement among ${audienceTarget}.`;
  }

  // Celebration / Commemoration / Observance / Day
  if (
    lowerName.includes('celebration') ||
    lowerName.includes('day') ||
    lowerName.includes('commemoration') ||
    lowerName.includes('observance')
  ) {
    return `A dedicated program organized to observe ${cleanName}, fostering community awareness, active reflection, and meaningful engagement among ${audienceTarget}.`;
  }

  // Inauguration / Valedictory
  if (
    lowerName.includes('inauguration') ||
    lowerName.includes('valedictory') ||
    lowerName.includes('launch') ||
    lowerName.includes('closing')
  ) {
    return `A formal institutional session conducted for ${cleanName}, marking an important milestone and engaging ${audienceTarget} with purposeful reflection.`;
  }

  // Default professional synthesis based on program name
  return `A specialized academic session exploring the principles and practical understanding of ${cleanName}, designed to enhance ${audienceTarget}’ comprehension and scholarly development.`;
}

/**
 * Auto-generates the professional Program Report text strictly conforming to:
 *
 * Program Name
 *
 * **Date & Time**
 * [actual saved program date and time]
 *
 * **Place Held**
 * [actual saved venue/place]
 *
 * **For Whom**
 * [actual saved target audience]
 *
 * **Resource Person**
 * [actual saved resource person/faculty] (omitted if empty)
 *
 * [Short description of the program based on the Program Name]
 */
export function generateProgramReport({
  name,
  date,
  time,
  place,
  audience,
  resourcePerson,
  category,
}: GenerateReportParams): string {
  const cleanName = (name || '').trim();
  if (!cleanName) return '';

  const sections: string[] = [];

  // 1. Program Name (in prominent uppercase format as shown in example)
  sections.push(cleanName.toUpperCase());

  // 2. Date & Time
  const formattedDate = formatReportDate(date || '');
  const formattedTime = formatReportTime(time || '');
  let dateTimeStr = '';
  if (formattedDate && formattedTime) {
    dateTimeStr = `${formattedDate}, ${formattedTime}`;
  } else if (formattedDate) {
    dateTimeStr = formattedDate;
  } else if (formattedTime) {
    dateTimeStr = formattedTime;
  }

  if (dateTimeStr) {
    sections.push(`**Date & Time**\n${dateTimeStr}`);
  }

  // 3. Place Held
  const cleanPlace = (place || '').trim();
  if (cleanPlace) {
    sections.push(`**Place Held**\n${cleanPlace}`);
  }

  // 4. For Whom
  const cleanAudience = (audience || '').trim();
  if (cleanAudience) {
    sections.push(`**For Whom**\n${cleanAudience}`);
  }

  // 5. Resource Person (Omitted completely if empty)
  const cleanResourcePerson = (resourcePerson || '').trim();
  if (cleanResourcePerson) {
    sections.push(`**Resource Person**\n${cleanResourcePerson}`);
  }

  // 6. Short description of the program based on the Program Name
  const shortDescription = generateShortDescription(cleanName, cleanAudience, category);
  if (shortDescription) {
    sections.push(shortDescription);
  }

  return sections.join('\n\n');
}

/**
 * Renders markdown bold (**text**) and line breaks in reports and details views cleanly.
 */
export function renderReportMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Check if line contains **bold** markdown tags
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={partIdx} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
