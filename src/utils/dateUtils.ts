export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type AcademicDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export const ALL_DAYS: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const ACADEMIC_DAYS: AcademicDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export interface DayInfo {
  todayName: DayOfWeek;
  tomorrowName: DayOfWeek;
  targetTomorrowDay: AcademicDay;
  todayIndex: number;
  tomorrowIndex: number;
  formattedToday: string;
  formattedTomorrow: string;
  isWeekend: boolean;
  isToday: (day: string) => boolean;
  isTomorrow: (day: string) => boolean;
  isNextAcademicDay: (day: string) => boolean;
}

export function getCurrentDayInfo(referenceDate: Date = new Date()): DayInfo {
  const todayIndex = referenceDate.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
  const todayName = ALL_DAYS[todayIndex];

  const tomorrowDate = new Date(referenceDate);
  tomorrowDate.setDate(referenceDate.getDate() + 1);
  const tomorrowIndex = tomorrowDate.getDay();
  const tomorrowName = ALL_DAYS[tomorrowIndex];

  // For school academic timetable (Monday-Friday)
  let targetTomorrowDay: AcademicDay = 'Monday';
  if (tomorrowName === 'Saturday' || tomorrowName === 'Sunday') {
    targetTomorrowDay = 'Monday';
  } else {
    targetTomorrowDay = tomorrowName as AcademicDay;
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  const formattedToday = referenceDate.toLocaleDateString(undefined, dateOptions);
  const formattedTomorrow = tomorrowDate.toLocaleDateString(undefined, dateOptions);

  return {
    todayName,
    tomorrowName,
    targetTomorrowDay,
    todayIndex,
    tomorrowIndex,
    formattedToday,
    formattedTomorrow,
    isWeekend: todayName === 'Saturday' || todayName === 'Sunday',
    isToday: (day: string) => day.toLowerCase() === todayName.toLowerCase(),
    isTomorrow: (day: string) => day.toLowerCase() === tomorrowName.toLowerCase(),
    isNextAcademicDay: (day: string) => day.toLowerCase() === targetTomorrowDay.toLowerCase(),
  };
}
