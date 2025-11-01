import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ItineraryPDFExportProps {
  itineraryData: any;
  tripData: any;
}

export function ItineraryPDFExport({
  itineraryData,
  tripData,
}: ItineraryPDFExportProps) {
  const generatePDF = () => {
    if (!itineraryData) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download the PDF");
      return;
    }

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${itineraryData.destination || "Travel"} Itinerary</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 40px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #DA880F;
            padding-bottom: 20px;
          }
          
          .header h1 {
            color: #DA880F;
            font-size: 32px;
            margin-bottom: 10px;
          }
          
          .header p {
            color: #666;
            font-size: 14px;
          }
          
          .trip-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #FFF6EE;
            border-radius: 8px;
          }
          
          .trip-info div {
            font-size: 14px;
          }
          
          .trip-info strong {
            color: #DA880F;
            display: inline-block;
            min-width: 100px;
          }
          
          .summary {
            margin-bottom: 30px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #DA880F;
            border-radius: 4px;
          }
          
          .summary h2 {
            color: #DA880F;
            font-size: 18px;
            margin-bottom: 10px;
          }
          
          .budget-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #FFF6EE;
            border-radius: 8px;
          }
          
          .budget-section h3 {
            color: #DA880F;
            font-size: 20px;
            margin-bottom: 15px;
          }
          
          .budget-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
          }
          
          .budget-item {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
          }
          
          .budget-total {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #DA880F;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            font-size: 16px;
          }
          
          .day-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .day-header {
            background: #DA880F;
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .day-header h3 {
            font-size: 18px;
            margin: 0;
          }
          
          .day-cost {
            background: rgba(255, 255, 255, 0.2);
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
          }
          
          .itinerary-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .itinerary-table th {
            background: #FFF6EE;
            color: #DA880F;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            border-bottom: 2px solid #DA880F;
          }
          
          .itinerary-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            font-size: 12px;
            vertical-align: top;
          }
          
          .itinerary-table tr:last-child td {
            border-bottom: none;
          }
          
          .activity-name {
            font-weight: 600;
            color: #DA880F;
          }
          
          .meals-section, .accommodation-section {
            padding: 15px 20px;
            background: #f9f9f9;
          }
          
          .meals-section h4, .accommodation-section h4 {
            color: #DA880F;
            font-size: 14px;
            margin-bottom: 8px;
          }
          
          .meal-item, .accommodation-info {
            font-size: 12px;
            margin-bottom: 5px;
          }
          
          .expense-summary {
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, #FFF6EE 0%, #ffffff 100%);
            border: 2px solid #DA880F;
            border-radius: 12px;
          }
          
          .expense-summary h2 {
            color: #DA880F;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
          }
          
          .expense-category {
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border: 1px solid #DA880F20;
            border-radius: 8px;
          }
          
          .expense-category h4 {
            color: #DA880F;
            font-size: 14px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .expense-details {
            font-size: 12px;
            color: #666;
            padding-left: 15px;
          }
          
          .expense-details li {
            margin-bottom: 4px;
          }
          
          .total-cards {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          
          .total-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          
          .total-card.per-person {
            background: #DA880F10;
            border: 2px solid #DA880F;
          }
          
          .total-card.group-total {
            background: #DA880F;
            color: white;
          }
          
          .total-card p:first-child {
            font-size: 12px;
            margin-bottom: 5px;
            opacity: 0.8;
          }
          
          .total-card p:last-child {
            font-size: 24px;
            font-weight: bold;
          }
          
          .cost-saving-tips {
            background: #e8f5e9;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
          }
          
          .cost-saving-tips h4 {
            color: #2e7d32;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .cost-saving-tips li {
            font-size: 12px;
            color: #1b5e20;
            margin-bottom: 6px;
            line-height: 1.5;
          }
          
          .tips-section {
            margin-top: 30px;
            padding: 20px;
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
          }
          
          .tips-section h3 {
            color: #1e40af;
            font-size: 18px;
            margin-bottom: 15px;
          }
          
          .tips-section ul {
            padding-left: 20px;
          }
          
          .tips-section li {
            margin-bottom: 8px;
            font-size: 13px;
          }
          
          .final-total {
            margin-top: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #DA880F 0%, #c9770b 100%);
            color: white;
            text-align: center;
            border-radius: 12px;
          }
          
          .final-total p:first-child {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
          }
          
          .final-total p:last-child {
            font-size: 32px;
            font-weight: bold;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            .day-section {
              page-break-inside: avoid;
            }
            
            @page {
              margin: 1cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌍 ${itineraryData.destination || "Your Travel Itinerary"}</h1>
          <p>Generated on ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</p>
        </div>
        
        <div class="trip-info">
          ${
            itineraryData.destination
              ? `<div><strong>Destination:</strong> ${itineraryData.destination}</div>`
              : ""
          }
          ${
            itineraryData.duration
              ? `<div><strong>Duration:</strong> ${itineraryData.duration}</div>`
              : ""
          }
          ${
            tripData.travelers
              ? `<div><strong>Travelers:</strong> ${tripData.travelers.adults} Adult(s), ${tripData.travelers.children} Child(ren)</div>`
              : ""
          }
          ${
            tripData.budget
              ? `<div><strong>Budget:</strong> ${tripData.budget}</div>`
              : ""
          }
          ${
            tripData.travelVibe
              ? `<div><strong>Travel Vibe:</strong> ${tripData.travelVibe.join(
                  ", "
                )}</div>`
              : ""
          }
          ${
            tripData.travelType
              ? `<div><strong>Travel Type:</strong> ${tripData.travelType}</div>`
              : ""
          }
        </div>
        
        ${
          itineraryData.summary
            ? `
          <div class="summary">
            <h2>Trip Summary</h2>
            <p>${itineraryData.summary}</p>
          </div>
        `
            : ""
        }
        
        ${
          itineraryData.budgetBreakdown
            ? `
          <div class="budget-section">
            <h3>💰 Budget Overview</h3>
            <div class="budget-grid">
              ${Object.entries(itineraryData.budgetBreakdown)
                .map(
                  ([key, value]) => `
                <div class="budget-item">
                  <span>${key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                  <strong>${value}</strong>
                </div>
              `
                )
                .join("")}
            </div>
            ${
              itineraryData.totalBudget
                ? `
              <div class="budget-total">
                <span>Total Budget:</span>
                <span>${itineraryData.totalBudget}</span>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        
        ${
          itineraryData.itineraryTable &&
          itineraryData.itineraryTable.length > 0
            ? `
          <h2 style="color: #DA880F; font-size: 24px; margin: 30px 0 20px 0;">📅 Day-by-Day Itinerary</h2>
          
          ${itineraryData.itineraryTable
            .map(
              (day, index) => `
            <div class="day-section">
              <div class="day-header">
                <h3>Day ${day.day || index + 1}${
                day.theme ? `: ${day.theme}` : ""
              }</h3>
                ${
                  day.dailyCost
                    ? `<div class="day-cost">${day.dailyCost}</div>`
                    : ""
                }
              </div>
              
              ${
                day.rows && day.rows.length > 0
                  ? `
                <table class="itinerary-table">
                  <thead>
                    <tr>
                      <th style="width: 10%">Time</th>
                      <th style="width: 20%">Activity</th>
                      <th style="width: 40%">Description</th>
                      <th style="width: 15%">Distance</th>
                      <th style="width: 15%">Pricing</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${day.rows
                      .map(
                        (row) => `
                      <tr>
                        <td>${row.time || "-"}</td>
                        <td class="activity-name">${row.activity || "-"}</td>
                        <td>${row.description || "-"}</td>
                        <td>${row.distance || "-"}</td>
                        <td style="color: #DA880F; font-weight: 600;">${
                          row.pricing || "-"
                        }</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
                  : ""
              }
              
              ${
                day.meals
                  ? `
                <div class="meals-section">
                  <h4>🍽️ Meals</h4>
                  ${
                    day.meals.breakfast
                      ? `<div class="meal-item"><strong>Breakfast:</strong> ${day.meals.breakfast}</div>`
                      : ""
                  }
                  ${
                    day.meals.lunch
                      ? `<div class="meal-item"><strong>Lunch:</strong> ${day.meals.lunch}</div>`
                      : ""
                  }
                  ${
                    day.meals.dinner
                      ? `<div class="meal-item"><strong>Dinner:</strong> ${day.meals.dinner}</div>`
                      : ""
                  }
                </div>
              `
                  : ""
              }
              
              ${
                day.accommodation
                  ? `
                <div class="accommodation-section">
                  <h4>🏨 Accommodation</h4>
                  <div class="accommodation-info">${day.accommodation}</div>
                </div>
              `
                  : ""
              }
            </div>
          `
            )
            .join("")}
        `
            : ""
        }
        
        ${
          itineraryData.expenseSummary
            ? `
          <div class="expense-summary">
            <h2>💰 Complete Expense Summary</h2>
            
            ${
              itineraryData.expenseSummary.perPersonBreakdown
                ? `
              <h3 style="color: #DA880F; font-size: 18px; margin-bottom: 15px;">Per Person Breakdown:</h3>
              
              ${Object.entries(itineraryData.expenseSummary.perPersonBreakdown)
                .map(
                  ([category, data]: any) => `
                <div class="expense-category">
                  <h4>
                    <span>${
                      category === "miscellaneous"
                        ? "Misc. Expenses"
                        : category.charAt(0).toUpperCase() + category.slice(1)
                    }</span>
                    <span>${data.amount}</span>
                  </h4>
                  ${
                    data.details && data.details.length > 0
                      ? `
                    <ul class="expense-details">
                      ${data.details
                        .map((detail: string) => `<li>${detail}</li>`)
                        .join("")}
                    </ul>
                  `
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            `
                : ""
            }
            
            <div class="total-cards">
              ${
                itineraryData.expenseSummary.totalPerPerson
                  ? `
                <div class="total-card per-person">
                  <p>Total Per Person</p>
                  <p>${itineraryData.expenseSummary.totalPerPerson}</p>
                </div>
              `
                  : ""
              }
              
              ${
                itineraryData.expenseSummary.totalForGroup
                  ? `
                <div class="total-card group-total">
                  <p>Total for Entire Group</p>
                  <p>${itineraryData.expenseSummary.totalForGroup}</p>
                </div>
              `
                  : ""
              }
            </div>
            
            ${
              itineraryData.expenseSummary.costSavingTips &&
              itineraryData.expenseSummary.costSavingTips.length > 0
                ? `
              <div class="cost-saving-tips">
                <h4>💡 Cost Saving Tips</h4>
                <ul>
                  ${itineraryData.expenseSummary.costSavingTips
                    .map((tip: string) => `<li>✓ ${tip}</li>`)
                    .join("")}
                </ul>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
        
        ${
          itineraryData.localTips && itineraryData.localTips.length > 0
            ? `
          <div class="tips-section">
            <h3>💡 Local Tips & Recommendations</h3>
            <ul>
              ${itineraryData.localTips
                .map((tip: string) => `<li>${tip}</li>`)
                .join("")}
            </ul>
          </div>
        `
            : ""
        }
        
        ${
          itineraryData.totalEstimatedCost
            ? `
          <div class="final-total">
            <p>Total Estimated Trip Cost</p>
            <p>${itineraryData.totalEstimatedCost}</p>
          </div>
        `
            : ""
        }
      </body>
      </html>
    `;

    // Write content and trigger print
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  };

  return (
    <Button
      onClick={generatePDF}
      className="bg-[#DA880F] hover:bg-[#c9770b] text-white gap-2"
      disabled={!itineraryData}
    >
      <Download size={18} />
      Export as PDF
    </Button>
  );
}
