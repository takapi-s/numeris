export type Ability = {
  name: string;
  title: string;
  playAbility?: string;
  traitAbility?: string;
  number: number;
};

export type Card = {
  id: number;
  color: string;
  number: number;
  ability?: Ability;
};

