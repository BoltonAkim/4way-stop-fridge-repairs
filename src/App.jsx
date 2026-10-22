
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { jsPDF } from "jspdf";

const STORAGE_KEY = "iri-transactions";

const money = (amount) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount);

function getMonthKey(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
}

function getCurrentMonth() {
  return getMonthKey(new Date());
}

function getCategory(description) {
  const text = description.toLowerCase();

  const categories = {
    Transport: ["transport", "taxi", "bus", "uber", "fuel", "petrol"],
    Food: ["food", "groceries", "lunch", "bread", "milk"],
    Rent: ["rent", "rental"],
    Stock: ["stock", "inventory", "supplies", "parts", "spares"],
    Utilities: ["electricity", "water", "airtime", "data"],
    Repairs: ["repair", "maintenance", "tools", "compressor", "gas"],
  };

  for (const [category, words] of Object.entries(categories)) {
    if (words.some((word) => text.includes(word))) return category;
  }

  return "Other";
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [transactions, setTransactions] = useState(loadTransactions);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [message, setMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
const backupFileRef = useRef(null);
const [activePage, setActivePage] = useState("home");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      setMessage("Could not save records. Check your browser storage.");
    }
  }, [transactions]);

  // Include the current month, recent months and all months
  // containing saved transactions.
  const availableMonths = useMemo(() => {
    const months = new Set();
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.add(getMonthKey(date));
    }

    transactions.forEach((item) => {
      if (item.date) months.add(getMonthKey(item.date));
    });

    return [...months].sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((item) => item.date && getMonthKey(item.date) === selectedMonth)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactions, selectedMonth]
  );

  const totals = useMemo(() => {
    const income = monthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = monthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return { income, expenses, profit: income - expenses };
  }, [monthTransactions]);

  const financialInsights = useMemo(() => {
    const income = totals.income;
    const expenses = totals.expenses;
    const profit = totals.profit;

    const profitMargin =
      income > 0 ? (profit / income) * 100 : null;

    const expenseRatio =
      income > 0 ? (expenses / income) * 100 : null;

    // Find the previous calendar month.
    const [year, month] = selectedMonth.split("-").map(Number);
    const previousDate = new Date(year, month - 2, 1);
    const previousKey = getMonthKey(previousDate);

    const previousRecords = transactions.filter(
      (item) =>
        item.date && getMonthKey(item.date) === previousKey
    );

    const previousIncome = previousRecords
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const previousExpenses = previousRecords
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const percentageChange = (current, previous) =>
      previous > 0
        ? ((current - previous) / previous) * 100
        : null;

    const incomeChange = percentageChange(income, previousIncome);
    const expenseChange = percentageChange(
      expenses,
      previousExpenses
    );

    let status = "healthy";
    let warning = "Your recorded finances are currently healthy.";

    if (income === 0 && expenses === 0) {
      status = "no-data";
      warning =
        "Not enough recorded income or expenses to assess financial health.";
    } else if (income === 0 && expenses > 0) {
      status = "loss";
      warning =
        "LOSS WARNING: Expenses are recorded, but no income has been recorded this month.";
    } else if (profit < 0) {
      status = "loss";
      warning =
        "LOSS WARNING: Expenses exceed income by " +
        money(Math.abs(profit)) +
        ". You are operating at a recorded loss.";
    } else if (profit === 0 && income > 0) {
      status = "loss";
      warning =
        "BREAK-EVEN WARNING: All recorded income has been used by expenses. There is no profit buffer.";
    } else if (profitMargin <= 5) {
      status = "danger";
      warning =
        "HIGH RISK: Only " +
        profitMargin.toFixed(1) +
        "% of income remains as profit. You are close to breaking even.";
    } else if (profitMargin <= 15) {
      status = "caution";
      warning =
        "CAUTION: Your profit margin is " +
        profitMargin.toFixed(1) +
        "%. Rising expenses could push the business towards a loss.";
    } else if (
      incomeChange !== null &&
      expenseChange !== null &&
      expenseChange > incomeChange &&
      expenses > 0
    ) {
      status = "caution";
      warning =
        "TREND WARNING: Expenses are growing faster than income compared with last month. Monitor your costs closely.";
    }

    return {
      profitMargin,
      expenseRatio,
      incomeChange,
      expenseChange,
      previousKey,
      status,
      warning,
    };
  }, [totals, selectedMonth, transactions]);


  const monthlyPerformance = useMemo(() => {
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - i);

      const key = getMonthKey(date);
      const records = transactions.filter(
        (item) => item.date && getMonthKey(item.date) === key
      );

      const income = records
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const expenses = records
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      months.push({
        key,
        label: date.toLocaleDateString("en-ZA", {
          month: "short",
          year: "2-digit",
        }),
        income,
        expenses,
        profit: income - expenses,
        count: records.length,
      });
    }

    return months;
  }, [transactions]);


  const businessAdvice = useMemo(() => {
    const records = monthTransactions;

    const expensesByCategory = {};

    records
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const category = getCategory(item.description);
        expensesByCategory[category] =
          (expensesByCategory[category] || 0) +
          Number(item.amount || 0);
      });

    const largestExpenses = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const margin =
      totals.income > 0
        ? (totals.profit / totals.income) * 100
        : null;

    const advice = [];

    if (totals.income === 0 && totals.expenses === 0) {
      advice.push({
        title: "Start tracking your finances",
        message:
          "Record your income and expenses to unlock personalised business advice."
      });
    } else if (totals.income === 0) {
      advice.push({
        title: "Income warning",
        message:
          "You have recorded expenses but no income this month. Check whether any income is missing from your records."
      });
    } else if (totals.profit < 0) {
      advice.push({
        title: "Urgent: Reduce the loss",
        message:
          `Your expenses exceed your income by ${money(Math.abs(totals.profit))}. Review costs and outstanding customer payments before committing to new spending.`
      });
    } else if (totals.profit === 0) {
      advice.push({
        title: "Break-even warning",
        message:
          "All recorded income has been used by expenses. Review your pricing and operating costs to create a profit buffer."
      });
    } else if (margin <= 5) {
      advice.push({
        title: "Profit margin is very low",
        message:
          `Only ${margin.toFixed(1)}% of your income remains as profit. Review parts costs, transport, and job pricing before accepting low-margin work.`
      });
    } else if (margin <= 15) {
      advice.push({
        title: "Protect your profit",
        message:
          `Your profit margin is ${margin.toFixed(1)}%. Monitor expenses and check that each repair job is priced to cover its costs.`
      });
    } else {
      advice.push({
        title: "Keep building on your progress",
        message:
          `Your recorded profit margin is ${margin.toFixed(1)}%. Keep tracking costs and setting aside money for future business expenses.`
      });
    }

    if (largestExpenses.length > 0) {
      const [category, amount] = largestExpenses[0];

      advice.push({
        title: "Largest expense category",
        message:
          `${category} is your largest recorded expense category at ${money(amount)}. Check whether there are reasonable savings to make without reducing repair quality.`
      });
    }

    if (totals.income > 0 && totals.expenses > totals.income * 0.8) {
      advice.push({
        title: "High spending alert",
        message:
          "More than 80% of recorded income has gone to expenses. Review upcoming costs before making non-essential purchases."
      });
    }



    return advice;
  }, [monthTransactions, totals]);
  const downloadMonthlyStatement = () => {
    const doc = new jsPDF();

    const monthLabel = new Date(
      Number(selectedMonth.split("-")[0]),
      Number(selectedMonth.split("-")[1]) - 1,
      1
    ).toLocaleDateString("en-ZA", {
      month: "long",
      year: "numeric",
    });

    const formatMoney = (amount) =>
      `R ${Number(amount || 0).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    doc.setFontSize(20);
    doc.text("4WAY STOP FRIDGE REPAIRS", 14, 20);

    doc.setFontSize(15);
    doc.text("Monthly Financial Statement", 14, 30);

    doc.setFontSize(11);
    doc.text(`Statement period: ${monthLabel}`, 14, 40);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, 14, 47);

    doc.setFontSize(12);
    doc.text(`Total income: ${formatMoney(totals.income)}`, 14, 62);
    doc.text(`Total expenses: ${formatMoney(totals.expenses)}`, 14, 70);
    doc.text(`Net profit / loss: ${formatMoney(totals.profit)}`, 14, 78);

    const margin =
      totals.income > 0
        ? (totals.profit / totals.income) * 100
        : null;

    doc.text(
      `Profit margin: ${margin === null ? "N/A" : `${margin.toFixed(1)}%`}`,
      14,
      86
    );

    let y = 101;

    doc.setFontSize(10);
    doc.text("Date", 14, y);
    doc.text("Type", 42, y);
    doc.text("Description", 67, y);
    doc.text("Amount", 195, y, { align: "right" });

    y += 5;
    doc.line(14, y, 196, y);
    y += 7;

    monthTransactions.forEach((item) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      const description = doc.splitTextToSize(
        String(item.description || "Transaction"),
        90
      );

      doc.text(String(item.date || ""), 14, y);
      doc.text(
        item.type === "income" ? "Income" : "Expense",
        42,
        y
      );
      doc.text(description, 67, y);

      doc.text(
        formatMoney(item.amount),
        195,
        y,
        { align: "right" }
      );

      y += Math.max(description.length * 5, 7);
    });

    doc.save(`4Way-Stop-Statement-${selectedMonth}.pdf`);
  };

  
function parseCommand(command) {
  const text = command.trim();

  const match = text.match(
    /^(-)?\s*(.+?)\s+R?\s*(\d+(?:[.,]\d{1,2})?)$/i
  );

  if (!match) {
    setMessage(
      'Use "Services R800" for income or "-Gas R200" for an expense.'
    );
    return;
  }

  const sign = match[1];
  const label = match[2].trim();
  const value = Number(match[3].replace(",", "."));

  if (!label || !Number.isFinite(value) || value <= 0) {
    setMessage("Please enter a valid description and amount.");
    return;
  }

  const transactionType = sign === "-" ? "expense" : "income";

  const transaction = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    description: label,
    category:
      transactionType === "expense" ? getCategory(label) : "Sales",
    amount: Math.round(value * 100) / 100,
    type: transactionType,
    date: new Date().toISOString(),
  };

  setTransactions((current) => [transaction, ...current]);
  setSelectedMonth(getCurrentMonth());
  setType(transactionType);
  setDescription("");
  setAmount("");
  setMessage(
    `Saved successfully: ${label}, R${value.toFixed(2)} (${transactionType}).`
  );
}

function addTransaction(event) {
  event.preventDefault();

  const value = Number(amount);

  if (
    !description.trim() ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    setMessage("Enter a description and a valid amount.");
    return;
  }

  const transaction = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    description: description.trim(),
    category:
      type === "expense"
        ? getCategory(description)
        : "Sales",
    amount: Math.round(value * 100) / 100,
    type,
    date: new Date().toISOString(),
  };

  setTransactions((current) => [transaction, ...current]);
  setSelectedMonth(getCurrentMonth());
  setDescription("");
  setAmount("");
  setMessage("Transaction saved successfully.");
}


  function exportBackup() {
    try {
      const backup = {
        app: "4Way Stop Fridge Repairs",
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        transactions,
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `4way-stop-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setBackupMessage("Backup downloaded successfully.");
    } catch {
      setBackupMessage("Backup failed. Please try again.");
    }
  }

  function restoreBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);

        if (
          backup.app !== "4Way Stop Fridge Repairs" ||
          backup.formatVersion !== 1 ||
          !Array.isArray(backup.transactions)
        ) {
          throw new Error("Invalid backup format.");
        }

        const validTransactions = backup.transactions.every((item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.description === "string" &&
          typeof item.amount === "number" &&
          Number.isFinite(item.amount) &&
          item.amount > 0 &&
          ["income", "expense"].includes(item.type) &&
          typeof item.date === "string" &&
          !Number.isNaN(Date.parse(item.date)) &&
          typeof item.category === "string"
        );

        if (!validTransactions) {
          throw new Error("Invalid transaction data.");
        }

        const confirmed = window.confirm(
          `This backup contains ${backup.transactions.length} transactions. Restoring will replace all current transactions. Download a backup of your current records first if you want to keep them. Continue?`
        );

        if (!confirmed) {
          setBackupMessage("Restore cancelled. Existing records were kept.");
          return;
        }

        setTransactions(backup.transactions);
        setSelectedMonth(getCurrentMonth());
        setMessage("");
        setBackupMessage(
          `Restored ${backup.transactions.length} transactions successfully.`
        );
      } catch {
        setBackupMessage(
          "Restore failed. The file is invalid or not a compatible backup. Existing records were kept."
        );
      } finally {
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setBackupMessage("Could not read the file. Please try again.");
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function deleteTransaction(id) {
    const item = transactions.find((record) => record.id === id);
    if (!item) return;

    const confirmed = window.confirm(
      `Delete "${item.description}" (${money(item.amount)})?`
    );

    if (!confirmed) return;

    setTransactions((current) =>
      current.filter((record) => record.id !== id)
    );
    setMessage("Transaction deleted.");
  }

  function deleteSelectedMonth() {
    if (monthTransactions.length === 0) {
      setMessage("This month has no records to delete.");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ALL ${monthTransactions.length} records for ${getMonthLabel(selectedMonth)}? This cannot be undone.`
    );

    if (!confirmed) return;

    setTransactions((current) =>
      current.filter(
        (item) => !item.date || getMonthKey(item.date) !== selectedMonth
      )
    );
    setMessage(`Records for ${getMonthLabel(selectedMonth)} were deleted.`);
  }

  return (
    
    <main className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>4Way Stop</h2>
          <span>Fridge Repairs</span>
          <p>Powered by IRI-AI</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            type="button"
            className={activePage === "home" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("home")}
          >
            🏠 Home
          </button>

          <button
            type="button"
            className={activePage === "dashboard" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("dashboard")}
          >
            📊 Business Dashboard
          </button>

          <button
            type="button"
            className={activePage === "transactions" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("transactions")}
          >
            🧾 Transactions
          </button>

          <button
            type="button"
            className={activePage === "assistant" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("assistant")}
          >
            🤖 IRI-AI Assistant
          </button>

          <button
            type="button"
            className={activePage === "backup" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("backup")}
          >
            🛡️ Backup & Restore
          </button>
        </nav>
      </aside>

      <div className="app-content">

      <header className="topbar">
        <div className="brand-block">
          <h1 className="brand-title">4Way Stop Fridge Repairs</h1>
          <p className="powered-by">
            Powered by <strong>IRI-AI</strong>
          </p>
        </div>
        <div className="offline-label">● Local-first</div>
      </header>

      <section className="panel month-panel">
        <label htmlFor="month-picker">
          <strong>Business month</strong>
        </label>
        <select
          id="month-picker"
          value={selectedMonth}
          onChange={(event) => {
            setSelectedMonth(event.target.value);
            setMessage("");
          }}
        >
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {getMonthLabel(month)}
              {month === getCurrentMonth() ? " (Current month)" : ""}
            </option>
          ))}
        </select>
        <p className="hint">
          Viewing {getMonthLabel(selectedMonth)}. Each month's totals are
          calculated separately, and previous records stay saved.
        </p>
      </section>

      {activePage === "backup" && (
  <section className="panel backup-panel">
        <p className="eyebrow">DATA PROTECTION</p>
        <h2>Backup &amp; Restore</h2>
        <p>
          Protect your business records by downloading a backup.
          You can restore it later if you change computers or lose
          your browser data.
        </p>

        <div className="backup-actions">
          <button type="button" onClick={exportBackup}>
            Download Backup
          </button>

          <button
            type="button"
            onClick={() => backupFileRef.current?.click()}
          >
            Restore Backup
          </button>
          
          <button
            type="button"
            onClick={downloadMonthlyStatement}
          >
            Download Monthly PDF Statement
          </button>

          <input
            ref={backupFileRef}
            type="file"
            accept=".json,application/json"
            onChange={restoreBackup}
            hidden
          />
        </div>

        {backupMessage && (
          <p className="message" role="status">
            {backupMessage}
          </p>
        )}
      </section>)}

      <section className="summary">
        <article className="stat">
          <span>Monthly income</span>
          <strong>{money(totals.income)}</strong>
        </article>
        <article className="stat">
          <span>Monthly expenses</span>
          <strong>{money(totals.expenses)}</strong>
        </article>
        <article className="stat">
          <span>{totals.profit >= 0 ? "Net profit" : "Net loss"}</span>
          <strong className={totals.profit >= 0 ? "positive" : "negative"}>
            {money(totals.profit)}
          </strong>
        </article>
      </section>

      {activePage === "dashboard" && (
  <section className="panel dashboard-panel">
        <p className="eyebrow">BUSINESS INSIGHTS</p>
        <h2>Business Performance</h2>
        <p className="hint">
          Income and expenses over the last six months.
        </p>

<div className={`financial-health ${financialInsights.status}`}>
  <p className="eyebrow">IRI-AI FINANCIAL HEALTH CHECK</p>

  <h3>
    {financialInsights.status === "loss"
      ? "Financial Loss Alert"
      : financialInsights.status === "danger"
      ? "High Financial Risk"
      : financialInsights.status === "caution"
      ? "Financial Caution"
      : financialInsights.status === "no-data"
      ? "Insufficient Data"
      : "Financial Health"}
  </h3>

  <p role="status">{financialInsights.warning}</p>

  <div className="financial-metrics">
    <div>
      <span>Profit margin</span>
      <strong>
        {financialInsights.profitMargin === null
          ? "N/A"
          : `${financialInsights.profitMargin.toFixed(1)}%`}
      </strong>
    </div>

    <div>
      <span>Expenses / income</span>
      <strong>
        {financialInsights.expenseRatio === null
          ? "N/A"
          : `${financialInsights.expenseRatio.toFixed(1)}%`}
      </strong>
    </div>

    <div>
      <span>Income change vs last month</span>
      <strong>
        {financialInsights.incomeChange === null
          ? "N/A"
          : `${financialInsights.incomeChange > 0 ? "+" : ""}${financialInsights.incomeChange.toFixed(1)}%`}
      </strong>
    </div>

    <div>
      <span>Expense change vs last month</span>
      <strong>
        {financialInsights.expenseChange === null
          ? "N/A"
          : `${financialInsights.expenseChange > 0 ? "+" : ""}${financialInsights.expenseChange.toFixed(1)}%`}
      </strong>
    </div>
  </div>
</div>


<div className="business-advice">
  <p className="eyebrow">IRI-AI BUSINESS ADVISER</p>
  <h2>Your business action plan</h2>
  <p className="hint">
    Recommendations based on your recorded finances.
  </p>

  {businessAdvice.map((item, index) => (
    <div className="advice-item" key={index}>
      <h3>{item.title}</h3>
      <p>{item.message}</p>
    </div>
  ))}
</div>


        <div className="performance-list">
          {monthlyPerformance.map((month) => {
            const maximum = Math.max(
              month.income,
              month.expenses,
              1
            );

            return (
              <article className="performance-month" key={month.key}>
                <strong>{month.label}</strong>

                <div className="performance-bars">
                  <div className="performance-bar-row">
                    <span>Income</span>
                    <div className="performance-track">
                      <div
                        className="performance-bar income-bar"
                        style={{
                          width: `${(month.income / maximum) * 100}%`,
                        }}
                      />
                    </div>
                    <span>{money(month.income)}</span>
                  </div>

                  <div className="performance-bar-row">
                    <span>Expenses</span>
                    <div className="performance-track">
                      <div
                        className="performance-bar expense-bar"
                        style={{
                          width: `${(month.expenses / maximum) * 100}%`,
                        }}
                      />
                    </div>
                    <span>{money(month.expenses)}</span>
                  </div>
                </div>

                <div className="performance-footer">
                  <span>{month.count} transactions</span>
                  <strong className={month.profit >= 0 ? "positive" : "negative"}>
                    {month.profit >= 0 ? "Profit " : "Loss "}
                    {money(Math.abs(month.profit))}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>)}

      {activePage === "assistant" && (
  <section className="panel assistant">
        <p className="eyebrow">YOUR BUSINESS ASSISTANT</p>
        <h2>Talk to IRI-AI</h2>
        <p>Type a command like “Transport R200” to prepare an expense.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            parseCommand(event.currentTarget.command.value);
            event.currentTarget.reset();
          }}
          className="command-form"
        >
          <input
            name="command"
            aria-label="IRI-AI command"
            placeholder="e.g. Transport R200"
          />
          <button type="submit">Process command</button>
        </form>
        <p className="hint">
          Text commands work offline. Offline voice recognition comes next.
        </p>
      </section>)}

      {(activePage === "transactions" || activePage === "home") && (
  <section className="panel">
        <h2>Record a transaction</h2>
        <form onSubmit={addTransaction} className="transaction-form">
          <label>
            Transaction type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fridge repair"
              required
            />
          </label>
          <label>
            Amount (R)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="200.00"
              required
            />
          </label>
          <button type="submit">+ Save transaction</button>
        </form>
        {message && (
          <p role="status" className="message">
            {message}
          </p>
        )}
      </section>)}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{getMonthLabel(selectedMonth)} records</h2>
            <span>{monthTransactions.length} transactions</span>
          </div>
          <button
            type="button"
            className="delete-button"
            onClick={deleteSelectedMonth}
            disabled={monthTransactions.length === 0}
          >
            Delete month
          </button>
        </div>

        {monthTransactions.length === 0 ? (
          <p className="empty">
            No transactions for this month yet. Your monthly totals are
            R0.00. Add a transaction above to get started.
          </p>
        ) : (
          <div className="transaction-list">
            {monthTransactions.map((item) => (
              <article className="transaction" key={item.id}>
                <div className="transaction-icon">
                  {item.type === "income" ? "↗" : "↘"}
                </div>
                <div className="transaction-info">
                  <strong>{item.description}</strong>
                  <span>
                    {item.category} ·{" "}
                    {new Date(item.date).toLocaleString("en-ZA")}
                  </span>
                </div>
                <strong className={item.type === "income" ? "positive" : ""}>
                  {item.type === "income" ? "+" : "−"}
                  {money(item.amount)}
                </strong>
                <button
                  type="button"
                  className="delete-button"
                  aria-label={`Delete ${item.description}`}
                  onClick={() => deleteTransaction(item.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

       <footer>
        4Way Stop Fridge Repairs · Powered by IRI-AI · Records saved on this
        device.
      </footer>
      </div>
    </main>
  );
}
