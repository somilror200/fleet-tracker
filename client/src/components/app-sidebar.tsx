import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Map,
  Truck,
  Users,
  Route as RouteIcon,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { useQuery } from "@tanstack/react-query";
import type { Alert } from "@shared/schema";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Live Map", url: "/map", icon: Map },
  { title: "Vehicles", url: "/vehicles", icon: Truck },
  { title: "Drivers", url: "/drivers", icon: Users },
  { title: "Trips", url: "/trips", icon: RouteIcon },
  { title: "Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 3000,
  });
  const openAlerts = alerts?.filter((a) => !a.resolved).length ?? 0;

  return (
    <Sidebar data-testid="sidebar-nav">
      <SidebarHeader className="px-3 py-4">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-home-logo">
          <Logo className="h-7 w-7 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Fleet Tracker
            </span>
            <span className="text-xs text-sidebar-foreground/60">Victoria Regional Ops</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.title === "Alerts" && openAlerts > 0 && (
                      <SidebarMenuBadge data-testid="badge-open-alerts-count">
                        {openAlerts}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3">
        <p className="text-xs text-sidebar-foreground/50 leading-snug">
          Simulated live GPS demo · Melbourne–Ballarat corridor
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
