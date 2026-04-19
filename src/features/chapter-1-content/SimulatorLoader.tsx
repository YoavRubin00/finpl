import { memo, useMemo } from "react";
import type { ComponentType } from "react";

interface SimulatorLoaderProps {
  moduleId: string;
  onComplete: (score: number) => void;
}

type SimScreen = ComponentType<{ onComplete: (score: number) => void }>;

/**
 * Lazy-loads the correct simulation component based on module ID.
 * Uses inline require() so modules are only evaluated when first rendered,
 * instead of eagerly importing all 29 sims at LessonFlowScreen load time.
 */
const SIM_LOADERS: Record<string, () => SimScreen> = {
  // Chapter 0
  "mod-0-1": () => require("../chapter-0-content/simulations/BarterPuzzleScreen").BarterPuzzleScreen,
  // mod-0-2: no sim (basic financial terms)
  "mod-0-3": () => require("../chapter-0-content/simulations/InflationThiefScreen").InflationThiefScreen,
  "mod-0-4": () => require("../chapter-0-content/simulations/BudgetBalanceScreen").BudgetBalanceScreen,

  // Chapter 1
  "mod-1-1": () => require("./simulations").CompoundSimScreen,
  "mod-1-2": () => require("./simulations").MinusTrapGameScreen,
  "mod-1-3": () => require("./simulations").SnowballGameScreen,
  "mod-1-4": () => require("./simulations").BudgetGameScreen,
  "mod-1-5": () => require("./simulations").PayslipNinjaScreen,
  // mod-1-6 sim removed
  "mod-1-7": () => require("./simulations").BankCombatScreen,
  "mod-1-8": () => require("./simulations").ShoppingCartScreen,
  "mod-1-9": () => require("./simulations").EmergencyFundScreen,
  // Chapter 2
  "mod-2-10": () => require("../chapter-2-content/simulations").CreditScoreScreen,
  "mod-2-11": () => require("../chapter-2-content/simulations").TaxPuzzleScreen,
  "mod-2-12": () => require("../chapter-2-content/simulations").RetirementRaceScreen,
  "mod-2-13": () => require("../chapter-2-content/simulations").TaxGrinderScreen,
  "mod-2-14": () => require("../chapter-2-content/simulations").InsuranceShieldScreen,
  // Chapter 3
  "mod-3-15": () => require("../chapter-3-content/simulations").InflationRaceScreen,
  "mod-3-16": () => require("../chapter-3-content/simulations").PanicIndexScreen,
  "mod-3-17": () => require("../chapter-3-content/simulations").InvestmentPathScreen,
  "mod-3-18": () => require("../chapter-3-content/simulations").TrackSelectorScreen,
  // Chapter 4
  "mod-4-19": () => require("../chapter-4-content/simulations").RiskSliderScreen,
  "mod-4-20": () => require("../chapter-4-content/simulations").IndexLiveScreen,
  "mod-4-21": () => require("../chapter-4-content/simulations").ETFBuilderScreen,
  "mod-4-22": () => require("../chapter-4-content/simulations").TradingSimScreen,
  "mod-4-23": () => require("../chapter-4-content/simulations").DividendTreeScreen,
  "mod-4-24": () => require("../chapter-4-content/simulations").PortfolioManagerScreen,
  "mod-4-25": () => require("../chapter-4-content/simulations").StatementDetectiveScreen,
  "mod-4-26": () => require("../chapter-4-content/simulations").BrokerCompareScreen,
  "mod-4-27": () => require("../chapter-4-content/simulations").CrisisManagerScreen,
  "mod-4-28": () => require("../chapter-4-content/simulations").ChartReaderScreen,
  "mod-4-29": () => require("../chapter-4-content/simulations").StockSorterScreen,
  "mod-4-30": () => require("../chapter-4-content/simulations").IndexRaceScreen,
  // Chapter 4, Graham bonus modules
  "mod-4-b1": () => require("../chapter-4-content/simulations/GrahamPortfolioScreen").GrahamPortfolioScreen,
  "mod-4-b2": () => require("../chapter-4-content/simulations/MarginSafetyScreen").MarginSafetyScreen,
  "mod-4-b3": () => require("../chapter-4-content/simulations/PriceValueScreen").PriceValueScreen,
  "mod-4-b4": () => require("../chapter-4-content/simulations/CrisisTimelineScreen").CrisisTimelineScreen,
  // Chapter 5
  "mod-5-25": () => require("../chapter-5-content/simulations").FIRECalcScreen,
  "mod-5-26": () => require("../chapter-5-content/simulations").RealEstateScreen,
  "mod-5-27": () => require("../chapter-5-content/simulations").REITScreen,
  "mod-5-28": () => require("../chapter-5-content/simulations").RetirementCalcScreen,
  "mod-5-29": () => require("../chapter-5-content/simulations").EstatePlanningScreen,
  "mod-5-30": () => require("../chapter-5-content/simulations").CryptoSimScreen,
  "mod-5-31": () => require("../chapter-5-content/simulations").IRABuilderScreen,
};

export const SimulatorLoader = memo(function SimulatorLoader({
  moduleId,
  onComplete,
}: SimulatorLoaderProps) {
  const SimComponent = useMemo(() => {
    const loader = SIM_LOADERS[moduleId];
    return loader ? loader() : null;
  }, [moduleId]);

  if (!SimComponent) return null;

  return <SimComponent onComplete={onComplete} />;
});
