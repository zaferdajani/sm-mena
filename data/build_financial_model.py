"""Generates data/financial-model.csv and prints the summary table used in docs/06-financial-model.md.
All figures in Jordanian Dinar (JOD). Re-run after changing any assumption."""
import csv

# ---------- Assumptions ----------
QUALIFIED_RATE = 0.60          # briefs that pass moderation (real budget, real business)
RESPONSES_PER_BRIEF = 3        # agencies that pay to respond to a qualified brief
LEAD_FEE = 15                  # JOD per agency response, charged from month 7
SUB_PRICE = {1: 49, 2: 49, 3: 59}   # JOD / month, Pro plan
HIRE_RATE = {1: 0.30, 2: 0.35, 3: 0.40}       # qualified briefs that end in a hire
ESCROW_TAKEUP = {1: 0.0, 2: 0.25, 3: 0.45}    # hires paid through platform escrow
AVG_PROJECT = {1: 800, 2: 900, 3: 1000}       # JOD, first payment through escrow
ESCROW_COMMISSION = 0.08

briefs_per_month = {
    1: [10,10,10,30,30,30,60,60,60,60,60,60],
    2: [80,90,100,110,120,120,130,130,140,140,150,150],
    3: [170,180,190,200,210,220,230,240,250,250,260,260],
}
paying_agencies = {
    1: [0,0,0,0,0,0,5,8,10,12,14,15],
    2: [18,22,26,30,34,38,42,46,50,54,58,62],
    3: [64,66,68,70,72,74,76,78,80,82,84,86],
}
other_revenue = {1: 0, 2: 3000, 3: 12000}   # featured placement, reports, institutional deals

costs = {
    1: {"Company setup & legal": 3500, "Hosting, domains, tools": 150*12, "Ops/sales hire (from M4)": 900*9,
        "Part-time content & design (from M4)": 400*9, "Paid acquisition (from M4)": 1200*9,
        "Agency outreach & events": 2000, "Accounting & misc": 1500},
    2: {"Founder salary": 1500*12, "Ops & sales (2 people)": 2000*12, "Content & design": 500*12,
        "Paid acquisition": 2000*12, "Hosting, domains, tools": 300*12, "Legal, payments licensing": 4000,
        "Accounting & misc": 3000},
    3: {"Founder salary": 2000*12, "Team (ops x2, sales, support)": 4200*12, "Content & design": 600*12,
        "Paid acquisition": 3000*12, "Hosting, domains, tools": 500*12, "Legal & compliance": 4000,
        "Accounting & misc": 5000},
}

rows = []
summary = {}
for year in (1, 2, 3):
    briefs = sum(briefs_per_month[year])
    qualified = briefs * QUALIFIED_RATE
    charged_months = briefs_per_month[year][6:] if year == 1 else briefs_per_month[year]
    lead_rev = sum(charged_months) * QUALIFIED_RATE * RESPONSES_PER_BRIEF * LEAD_FEE
    sub_rev = sum(paying_agencies[year]) * SUB_PRICE[year]
    hires = qualified * HIRE_RATE[year]
    escrow_gmv = hires * ESCROW_TAKEUP[year] * AVG_PROJECT[year]
    escrow_rev = escrow_gmv * ESCROW_COMMISSION
    revenue = lead_rev + sub_rev + escrow_rev + other_revenue[year]
    cost = sum(costs[year].values())
    summary[year] = dict(briefs=briefs, qualified=qualified, hires=hires, lead_rev=lead_rev, sub_rev=sub_rev,
                         escrow_gmv=escrow_gmv, escrow_rev=escrow_rev, other=other_revenue[year],
                         revenue=revenue, cost=cost, net=revenue - cost)
    rows.append(["Year %d" % year, "Briefs submitted", round(briefs)])
    rows.append(["Year %d" % year, "Qualified briefs", round(qualified)])
    rows.append(["Year %d" % year, "Hires (est.)", round(hires)])
    rows.append(["Year %d" % year, "Revenue: lead fees", round(lead_rev)])
    rows.append(["Year %d" % year, "Revenue: agency subscriptions", round(sub_rev)])
    rows.append(["Year %d" % year, "Revenue: escrow commission", round(escrow_rev)])
    rows.append(["Year %d" % year, "Revenue: featured, data, partnerships", other_revenue[year]])
    rows.append(["Year %d" % year, "Total revenue", round(revenue)])
    for k, v in costs[year].items():
        rows.append(["Year %d" % year, "Cost: " + k, v])
    rows.append(["Year %d" % year, "Total costs", cost])
    rows.append(["Year %d" % year, "Net", round(revenue - cost)])

with open("financial-model.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["period", "line", "jod"])
    w.writerows(rows)

print("| Line | Year 1 | Year 2 | Year 3 |")
print("|---|---:|---:|---:|")
for label, key in [("Briefs submitted", "briefs"), ("Qualified briefs", "qualified"), ("Hires (est.)", "hires"),
                   ("Lead-fee revenue", "lead_rev"), ("Subscription revenue", "sub_rev"),
                   ("Escrow GMV", "escrow_gmv"), ("Escrow commission revenue", "escrow_rev"),
                   ("Featured, data, partnerships", "other"), ("**Total revenue**", "revenue"),
                   ("**Total costs**", "cost"), ("**Net**", "net")]:
    print("| %s | %s | %s | %s |" % (label, *["{:,}".format(round(summary[y][key])) for y in (1, 2, 3)]))
