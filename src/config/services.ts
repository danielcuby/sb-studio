// Services, prices (in pounds) and durations (in minutes). This is the only place they are defined.

export type Service = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
};

export const services: Service[] = [
  {
    id: "student",
    name: "Student haircut",
    price: 8,
    durationMinutes: 30,
    description: "Any cut for under-18s. Fade, taper or scissor work.",
  },
  {
    id: "adult",
    name: "Adult haircut",
    price: 10,
    durationMinutes: 30,
    description: "Skin fade, taper or classic cut, finished with a clean line-up.",
  },
  {
    id: "haircut-beard",
    name: "Haircut & beard",
    price: 14,
    durationMinutes: 45,
    description: "Full haircut plus beard shaped, faded and lined up.",
  },
];

export const currency = "GBP";

export function getService(id: string | null | undefined) {
  return services.find((s) => s.id === id);
}

export function formatPrice(price: number) {
  return `£${price}`;
}
