import React, { useState, useCallback, useEffect } from 'react';
import { Household, Expense, Notification, Rule, Budget, BucketGoal, Trip, Subscription } from './types';
import Dashboard from './components/Dashboard';
import ExpenseTracker from './components/ExpenseTracker';
import BucketGoals from './components/BucketGoals';
import TripPlanner from './components/TripPlanner';
import AiReport from './components/AiReport';
import Settings from './components/Settings';
import AddExpenseModal from './components/AddExpenseModal';
import BottomNavBar from './components/BottomNavBar';
import { BellIcon, ChartIcon, Cog6ToothIcon, DashboardIcon, MoneyIcon, PiggyBankIcon, PlaneIcon, PlusIcon, ArrowUpTrayIcon, ArrowPathIcon, LightBulbIcon, ChatBubbleBottomCenterTextIcon } from './components/icons/Icons';
import NotificationPanel from './components/NotificationPanel';
import { detectAnomalousExpense } from './services/geminiService';
import FileImport from './components/FileImport';
import Subscriptions from './components/Subscriptions';
import SavingsCoach from './components/SavingsCoach';
import AiChat from './components/AiChat';
import Button from './components/common/Button';
import * as db from './services/db';

export type View = 'dashboard' | 'expenses' | 'goals' | 'trips' | 'reports' | 'settings' | 'import' | 'subscriptions' | 'savings';

const formatCurrencyForNotif = (amountInCents: number): string => {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const App: React.FC = () => {
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAddExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isNotificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const reloadData = useCallback(async () => {
    const data = await db.loadHouseholdData();
    setHousehold(data);
  }, []);

  useEffect(() => {
    const init = async () => {
        await db.initDB();
        await reloadData();
    };
    init();
  }, [reloadData]);

  if (!household) {
    return <div className="flex justify-center items-center h-screen text-white">Loading Financial Data...</div>;
  }

  const unreadNotificationsCount = household.notifications.filter(n => !n.isRead).length;

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    const expenseWithId: Expense = {
        ...newExpense,
        id: `exp-${crypto.randomUUID()}`
    };

    const notificationsToAdd: Notification[] = [];

    // 1. Budget Alert Check
    const budget = household.budgets.find(b => b.categoryId === newExpense.categoryId);
    if (budget && budget.amount > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const expensesForCategoryThisMonth = household.expenses.filter(
            e => e.categoryId === newExpense.categoryId && new Date(e.date) >= startOfMonth
        );
        const spentBefore = expensesForCategoryThisMonth.reduce((sum, e) => sum + e.amount, 0);
        const spentAfter = spentBefore + newExpense.amount;
        const ninetyPercentBudget = budget.amount * 0.9;
        const categoryName = household.categories.find(c => c.id === newExpense.categoryId)?.name || 'a category';

        if (spentBefore < budget.amount && spentAfter >= budget.amount) {
            notificationsToAdd.push({ id: `notif-budget-exceeded-${crypto.randomUUID()}`, message: `You've exceeded your ${formatCurrencyForNotif(budget.amount)} budget for ${categoryName}!`, date: new Date().toISOString(), type: 'error', isRead: false });
        } else if (spentBefore < ninetyPercentBudget && spentAfter >= ninetyPercentBudget && spentAfter < budget.amount) {
            notificationsToAdd.push({ id: `notif-budget-warning-${crypto.randomUUID()}`, message: `You're approaching your ${formatCurrencyForNotif(budget.amount)} budget for ${categoryName}.`, date: new Date().toISOString(), type: 'warning', isRead: false });
        }
    }

    // 2. Anomaly Detection Check
    try {
        const anomalyResult = await detectAnomalousExpense(household, expenseWithId);
        if (anomalyResult.isAnomalous) {
            notificationsToAdd.push({ id: `notif-anomaly-${crypto.randomUUID()}`, message: `Unusual Spending Alert: ${anomalyResult.reasoning}`, date: new Date().toISOString(), type: 'warning', isRead: false });
        }
    } catch (error) {
        console.error("Failed to check for anomalous spending:", error);
    }

    await db.addExpense(expenseWithId, notificationsToAdd);
    await reloadData();
  };
  
  const updateHouseholdData = async (data: Partial<Omit<Household, 'id'>>) => {
      await db.updateHousehold(data);
      await reloadData();
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard household={household} />;
      case 'expenses':
        return <ExpenseTracker household={household} onUpdate={updateHouseholdData} />;
      case 'goals':
        return <BucketGoals household={household} onUpdate={updateHouseholdData} />;
      case 'trips':
          return <TripPlanner household={household} onUpdate={updateHouseholdData} />;
      case 'import':
        return <FileImport household={household} onAddExpense={handleAddExpense} />;
      case 'subscriptions':
        return <Subscriptions household={household} onUpdate={updateHouseholdData} />;
      case 'reports':
        return <AiReport household={household} />;
      case 'savings':
        return <SavingsCoach household={household} />;
      case 'settings':
        return <Settings household={household} onUpdate={updateHouseholdData} />;
      default:
        return <Dashboard household={household} />;
    }
  };

  const NavItem = ({ view, label, icon: Icon }: { view: View, label: string, icon: React.FC<any> }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full text-left transition-all duration-300 transform hover:scale-105 ${
        currentView === view ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="font-sans">
      <div className="flex">
        {/* Sidebar for larger screens */}
        <aside className="hidden md:block w-64 bg-slate-900/30 backdrop-blur-lg p-4 space-y-4 border-r border-slate-700/50 min-h-screen no-print">
          <h1 className="text-3xl font-bold text-white px-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">FinancelyAI</h1>
          <nav className="space-y-2 pt-4">
            <NavItem view="dashboard" label="Dashboard" icon={DashboardIcon} />
            <NavItem view="expenses" label="Expenses" icon={MoneyIcon} />
            <NavItem view="subscriptions" label="Subscriptions" icon={ArrowPathIcon} />
            <NavItem view="goals" label="Goals" icon={PiggyBankIcon} />
            <NavItem view="trips" label="Trips" icon={PlaneIcon} />
            <NavItem view="import" label="Import" icon={ArrowUpTrayIcon} />
            <NavItem view="reports" label="AI Reports" icon={ChartIcon} />
            <NavItem view="savings" label="Savings Ideas" icon={LightBulbIcon} />
            <NavItem view="settings" label="Settings" icon={Cog6ToothIcon} />
          </nav>
          <div className="pt-4 absolute bottom-6 w-56">
             <Button
                onClick={() => setAddExpenseModalOpen(true)}
                className="w-full"
            >
              <PlusIcon className="w-6 h-6" />
              <span>Add Expense</span>
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 capitalize">{currentView}</h2>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsChatOpen(true)} className="relative p-2 rounded-full hover:bg-slate-700 transition-colors" title="Chat with AI Assistant">
                        <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-gray-300" />
                    </button>
                    <button onClick={() => setNotificationPanelOpen(prev => !prev)} className="relative p-2 rounded-full hover:bg-slate-700 transition-colors" title="Notifications">
                        <BellIcon className="w-6 h-6 text-gray-300" />
                        {unreadNotificationsCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                {unreadNotificationsCount}
                            </span>
                        )}
                    </button>
                    <img src={household.members[0].avatarUrl} alt="User" className="w-10 h-10 rounded-full border-2 border-purple-500" />
                </div>
            </header>
            
            <div className="print-content">
                {renderView()}
            </div>
        </main>
      </div>

      {/* Bottom Nav for mobile */}
      <BottomNavBar 
        currentView={currentView} 
        setCurrentView={(v) => setCurrentView(v as View)} // Cast needed because BottomNavBar uses string IDs
        onAddExpenseClick={() => setAddExpenseModalOpen(true)}
        className="no-print"
      />

      {/* Modals and Panels */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        household={household}
        onAddExpense={handleAddExpense}
      />

      {isNotificationPanelOpen && (
          <NotificationPanel 
            notifications={household.notifications}
            onClose={() => setNotificationPanelOpen(false)}
          />
      )}

      <AiChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        household={household}
      />
    </div>
  );
};

export default App;
