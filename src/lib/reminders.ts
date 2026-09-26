export interface Reminder {
  text: string;
  ref: string;
}

/** Short motivational reminders on the virtue of dhikr (translations of meaning). */
export const REMINDERS: Reminder[] = [
  { text: "Verily, in the remembrance of Allah do hearts find rest.", ref: "Qur'an 13:28" },
  { text: "Remember Me; I will remember you.", ref: "Qur'an 2:152" },
  {
    text: "O you who have believed, remember Allah with much remembrance, and exalt Him morning and evening.",
    ref: "Qur'an 33:41–42",
  },
  {
    text: "So exalt Allah when you reach the evening and when you reach the morning.",
    ref: "Qur'an 30:17",
  },
  {
    text: "The example of the one who remembers his Lord and the one who does not is like the living and the dead.",
    ref: "al-Bukhari 6407",
  },
];

export function randomReminder(): Reminder {
  return REMINDERS[Math.floor(Math.random() * REMINDERS.length)] ?? REMINDERS[0]!;
}
