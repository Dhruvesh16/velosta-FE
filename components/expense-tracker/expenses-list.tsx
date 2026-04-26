"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Receipt,
  Utensils,
  Car,
  Bed,
  Ticket,
  ShoppingBag,
  Mountain,
  Fuel,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExpensesListProps {
  expenses: any[];
  members: any[];
  categories: any[];
  currency: string;
  onEdit: (expense: any) => void;
  onDelete: (expenseId: string) => void;
  currentUserId?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  utensils: <Utensils className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  bed: <Bed className="h-4 w-4" />,
  ticket: <Ticket className="h-4 w-4" />,
  "shopping-bag": <ShoppingBag className="h-4 w-4" />,
  mountain: <Mountain className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  "help-circle": <HelpCircle className="h-4 w-4" />,
};

export function ExpensesList({
  expenses,
  members,
  categories,
  currency,
  onEdit,
  onDelete,
  currentUserId,
}: ExpensesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency] || currency;
  };

  const formatCurrency = (amount: number) => {
    return `${getCurrencySymbol()}${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = expense.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || expense.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  // Group expenses by date
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredExpenses.forEach((expense) => {
      const dateKey = format(new Date(expense.date), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredExpenses]);

  const handleDelete = (expenseId: string) => {
    onDelete(expenseId);
    setDeleteConfirm(null);
  };

  if (expenses.length === 0) {
    return (
      <div className="rounded-3xl border border-black/5 bg-gradient-to-br from-white to-[var(--color-cream)]/30 p-8 sm:p-12 text-center">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[var(--color-brand)]/10 to-[var(--color-brand)]/5 flex items-center justify-center mb-5 animate-pulse">
          <Receipt className="h-8 w-8 sm:h-10 sm:w-10 text-[var(--color-brand)]" />
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold text-[var(--color-navy)] mb-2">
          No expenses yet
        </h3>
        <p className="text-[var(--color-navy)]/60 text-sm sm:text-base mb-4 max-w-md mx-auto">
          Start tracking your trip spending by adding your first expense.
        </p>
        <div className="mt-6 p-4 bg-white/60 rounded-2xl border border-black/5 max-w-md mx-auto">
          <p className="text-xs sm:text-sm font-medium text-[var(--color-navy)]/70 mb-2">
            Pro Tip
          </p>
          <p className="text-xs text-[var(--color-navy)]/60">
            Use quick add templates for common expenses like food, transport, and accommodation to save time!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-full border-black/10 bg-white"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-full border-black/10 bg-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-[var(--color-navy)]/50">
        {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
      </p>

      {/* Expenses List */}
      <div className="space-y-6">
        {groupedExpenses.map(([date, dayExpenses]) => (
          <div key={date}>
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-[var(--color-navy)]/60 truncate">
                {format(new Date(date), "EEEE, MMMM d")}
              </h3>
              <div className="flex-1 h-px bg-black/5" />
              <span className="text-xs sm:text-sm text-[var(--color-navy)]/40 flex-shrink-0">
                {formatCurrency(dayExpenses.reduce((sum, e) => sum + e.amount, 0))}
              </span>
            </div>
            <div className="space-y-2">
              {dayExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  categories={categories}
                  formatCurrency={formatCurrency}
                  isExpanded={expandedExpense === expense.id}
                  onToggleExpand={() =>
                    setExpandedExpense(
                      expandedExpense === expense.id ? null : expense.id
                    )
                  }
                  onEdit={() => onEdit(expense)}
                  onDelete={() => setDeleteConfirm(expense.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              expense and update all balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="rounded-full bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExpenseCard({
  expense,
  categories,
  formatCurrency,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  expense: any;
  categories: any[];
  formatCurrency: (amount: number) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const category = categories.find((c) => c.id === expense.categoryId);
  const splitType = {
    EQUAL: "Split equally",
    EXACT: "Custom amounts",
    PERCENTAGE: "By percentage",
    SHARES: "By shares",
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white overflow-hidden hover:border-black/10 transition-colors">
      <div
        className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Category Icon */}
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: category?.color ? `${category.color}15` : "#f4f4f5",
            color: category?.color || "#71717a",
          }}
        >
          {category
            ? categoryIcons[category.icon] || <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            : <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--color-navy)] truncate text-sm">
            {expense.description}
          </h4>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--color-navy)]/50 mt-0.5 flex-wrap">
            <div className="flex items-center gap-1">
              <Avatar className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                <AvatarFallback
                  style={{ backgroundColor: expense.paidBy.avatarColor }}
                  className="text-white text-[8px] font-medium"
                >
                  {expense.paidBy.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[60px] sm:max-w-none">{expense.paidBy.name}</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{splitType[expense.splitType as keyof typeof splitType]}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-[var(--color-navy)] text-sm sm:text-base">
            {formatCurrency(expense.amount)}
          </p>
          <p className="text-[10px] sm:text-xs text-[var(--color-navy)]/40">
            {format(new Date(expense.date), "h:mm a")}
          </p>
        </div>

        {/* Expand/Collapse */}
        <button className="p-1 hover:bg-muted rounded-full flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-navy)]/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-navy)]/40" />
          )}
        </button>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex-shrink-0">
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--color-navy)]/40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onEdit} className="rounded-lg">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 rounded-lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-black/5 bg-muted/30">
          {expense.notes && (
            <p className="text-xs sm:text-sm text-[var(--color-navy)]/70 mb-3">{expense.notes}</p>
          )}
          <p className="text-xs font-medium text-[var(--color-navy)]/50 uppercase tracking-wider mb-2">
            Split Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expense.splits.map((split: any) => (
              <div
                key={split.id}
                className="flex items-center gap-2 bg-white rounded-xl p-2 sm:p-2.5 border border-black/5"
              >
                <Avatar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                  <AvatarFallback
                    style={{ backgroundColor: split.member.avatarColor }}
                    className="text-white text-[9px] sm:text-[10px] font-medium"
                  >
                    {split.member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-xs font-medium text-[var(--color-navy)] truncate">
                  {split.member.name}
                </span>
                <span className="text-xs font-medium text-[var(--color-navy)]/70 flex-shrink-0">
                  {formatCurrency(split.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
