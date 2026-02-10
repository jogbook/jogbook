import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["Public profile page", "Up to 10 booking requests/mo", "Basic analytics"],
    current: true,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    features: ["Unlimited booking requests", "Custom branding", "Priority support", "Advanced analytics", "Calendar sync"],
    highlighted: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    features: ["Everything in Pro", "Multi-DJ agency support", "API access", "Custom domain", "White-label options"],
  },
];

export default function Subscribe() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Subscribe</h1>
          <p className="text-muted-foreground mt-2">Choose a plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.highlighted ? "border-primary ring-1 ring-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check size={14} className="text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full font-bold"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Coming Soon"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
