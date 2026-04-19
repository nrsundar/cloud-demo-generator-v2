import React, { useState } from "react";
import AppLayoutBase from "@cloudscape-design/components/app-layout";
import SideNavigation, { SideNavigationProps } from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

const NAV_ITEMS: SideNavigationProps.Item[] = [
  { type: "link", text: "Home", href: "/" },
  { type: "link", text: "Generator", href: "/home" },
  { type: "link", text: "Request Demo", href: "/demo-request" },
  { type: "divider" },
  { type: "section", text: "Management", items: [
    { type: "link", text: "Admin Dashboard", href: "/admin" },
  ]},
  { type: "divider" },
  { type: "link", text: "Documentation", href: "https://cloudscape.design", external: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [navOpen, setNavOpen] = useState(true);
  const { user, logout } = useAuth();

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: "/",
            title: "Cloud Demo Generator v3",
          }}
          utilities={[
            ...(user
              ? [
                  {
                    type: "menu-dropdown" as const,
                    text: user.name || user.email,
                    iconName: "user-profile" as const,
                    items: [
                      { id: "email", text: user.email, disabled: true },
                      { id: "signout", text: "Sign out" },
                    ],
                    onItemClick: ({ detail }: any) => {
                      if (detail.id === "signout") {
                        logout();
                        navigate("/auth");
                      }
                    },
                  },
                ]
              : [
                  {
                    type: "button" as const,
                    text: "Sign In",
                    onClick: () => navigate("/auth"),
                  },
                ]),
          ]}
        />
      </div>
      <AppLayoutBase
        headerSelector="#top-nav"
        navigation={
          <SideNavigation
            activeHref={location}
            header={{ text: "Cloud Demo Generator v3", href: "/" }}
            items={NAV_ITEMS}
            onFollow={(e) => {
              e.preventDefault();
              navigate(e.detail.href);
            }}
          />
        }
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        toolsHide={true}
        content={children}
      />
    </>
  );
}
