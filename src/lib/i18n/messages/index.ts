import { common } from "./common";
import { nav } from "./nav";
import { today } from "./today";
import { week } from "./week";
import { month } from "./month";
import { charts } from "./charts";
import { insights } from "./insights";
import { reports } from "./reports";
import { goals } from "./goals";
import { recurring } from "./recurring";
import { transactions } from "./transactions";
import { txDialogs } from "./txDialogs";
import { settings } from "./settings";
import { categories } from "./categories";
import { notifications } from "./notifications";
import { pwa } from "./pwa";
import { ai } from "./ai";
import { auth } from "./auth";
import { landing } from "./landing";
import { accounts } from "./accounts";

export const MESSAGES = {
  common,
  nav,
  today,
  week,
  month,
  charts,
  insights,
  reports,
  goals,
  recurring,
  transactions,
  txDialogs,
  settings,
  categories,
  notifications,
  pwa,
  ai,
  auth,
  landing,
  accounts,
};

export type Namespace = keyof typeof MESSAGES;
