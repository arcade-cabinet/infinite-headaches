/**
 * Upgrade Shop Component
 * Purchase permanent upgrades with coins
 */

import { animate } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import {
  getCoins,
  getUpgradeCost,
  getUpgrades,
  purchaseUpgrade,
  type Upgrade,
} from "../progression/Upgrades";
import { GameButton } from "./GameButton";
import { GameCard } from "./GameCard";

interface UpgradeShopProps {
  onClose: () => void;
}

export function UpgradeShop({ onClose }: UpgradeShopProps) {
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [coins, setCoins] = useState(0);
  const [selectedUpgrade, setSelectedUpgrade] = useState<Upgrade | null>(null);
  const { fontSize, spacing, isMobile } = useResponsiveScale();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    setUpgrades(getUpgrades());
    setCoins(getCoins());
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    animate(containerRef.current, {
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 300,
      ease: "outBack",
    });
  }, []);

  const handlePurchase = useCallback((upgrade: Upgrade) => {
    const success = purchaseUpgrade(upgrade.id);
    if (success) {
      setUpgrades(getUpgrades());
      setCoins(getCoins());
      setSelectedUpgrade(null);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        <GameCard className="flex flex-col" style={{ padding: 0, maxHeight: "85vh" }}>
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-purple-500/30"
            style={{ padding: spacing.md }}
          >
            <div>
              <h2
                className="game-font text-yellow-400"
                style={{ fontSize: fontSize.xl, textShadow: "2px 2px 0 #000" }}
              >
                UPGRADE SHOP
              </h2>
              <p className="game-font text-purple-300" style={{ fontSize: fontSize.sm }}>
                Permanent upgrades for all games
              </p>
            </div>

            {/* Coin display */}
            <div className="flex items-center gap-2 bg-yellow-900/30 rounded-lg px-4 py-2">
              <span style={{ fontSize: fontSize.lg }}>🪙</span>
              <span className="game-font text-yellow-300" style={{ fontSize: fontSize.lg }}>
                {coins.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Upgrade grid */}
          <div className="flex-1 overflow-y-auto" style={{ padding: spacing.md }}>
            <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
              {upgrades.map((upgrade) => (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  coins={coins}
                  onSelect={() => setSelectedUpgrade(upgrade)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="border-t border-purple-500/30 flex justify-center"
            style={{ padding: spacing.md }}
          >
            <GameButton onClick={onClose} variant="secondary">
              CLOSE
            </GameButton>
          </div>
        </GameCard>

        {/* Purchase confirmation modal */}
        {selectedUpgrade && (
          <PurchaseModal
            upgrade={selectedUpgrade}
            coins={coins}
            onConfirm={() => handlePurchase(selectedUpgrade)}
            onCancel={() => setSelectedUpgrade(null)}
          />
        )}
      </div>
    </div>
  );
}

interface UpgradeCardProps {
  upgrade: Upgrade;
  coins: number;
  onSelect: () => void;
}

function UpgradeCard({ upgrade, coins, onSelect }: UpgradeCardProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const cost = getUpgradeCost(upgrade);
  const isMaxed = upgrade.currentLevel >= upgrade.maxLevel;
  const canAfford = coins >= cost;

  return (
    <button
      onClick={onSelect}
      disabled={isMaxed}
      className={`
        text-left rounded-xl p-3 transition-all duration-200
        ${
          isMaxed
            ? "bg-purple-900/30 opacity-60"
            : canAfford
              ? "bg-purple-800/50 hover:bg-purple-700/50 hover:scale-[1.02]"
              : "bg-purple-900/40 opacity-80"
        }
        border-2 ${isMaxed ? "border-green-500/30" : canAfford ? "border-purple-400/40" : "border-purple-600/30"}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-900/50"
          style={{ fontSize: "1.5rem" }}
        >
          {upgrade.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="game-font text-white truncate" style={{ fontSize: fontSize.md }}>
              {upgrade.name}
            </span>
            {isMaxed && <span className="text-green-400 text-xs">MAX</span>}
          </div>

          <p className="text-purple-300 truncate" style={{ fontSize: fontSize.xs }}>
            {upgrade.description}
          </p>

          {/* Level indicator */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-1">
              {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < upgrade.currentLevel ? "bg-yellow-400" : "bg-purple-700"
                  }`}
                />
              ))}
            </div>

            {!isMaxed && (
              <span
                className={`game-font ${canAfford ? "text-yellow-300" : "text-purple-400"}`}
                style={{ fontSize: fontSize.xs }}
              >
                🪙 {cost.toLocaleString()}
              </span>
            )}
          </div>

          {/* Current effect */}
          {upgrade.currentLevel > 0 && (
            <p className="text-green-400 mt-1" style={{ fontSize: fontSize.xs }}>
              {upgrade.effectDescription(upgrade.currentLevel)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

interface PurchaseModalProps {
  upgrade: Upgrade;
  coins: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function PurchaseModal({ upgrade, coins, onConfirm, onCancel }: PurchaseModalProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const cost = getUpgradeCost(upgrade);
  const canAfford = coins >= cost;
  const nextLevel = upgrade.currentLevel + 1;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <GameCard className="text-center" style={{ padding: spacing.lg, maxWidth: "320px" }}>
          <div style={{ fontSize: "3rem" }}>{upgrade.icon}</div>

          <h3 className="game-font text-yellow-400 mt-2" style={{ fontSize: fontSize.lg }}>
            {upgrade.name}
          </h3>

          <p className="text-purple-200 mt-1" style={{ fontSize: fontSize.sm }}>
            Level {upgrade.currentLevel} → {nextLevel}
          </p>

          <div
            className="bg-purple-900/50 rounded-lg py-2 px-4 mt-3"
            style={{ fontSize: fontSize.sm }}
          >
            <span className="text-purple-300">Effect: </span>
            <span className="text-green-400">{upgrade.effectDescription(nextLevel)}</span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <span style={{ fontSize: fontSize.lg }}>🪙</span>
            <span
              className={`game-font ${canAfford ? "text-yellow-300" : "text-red-400"}`}
              style={{ fontSize: fontSize.lg }}
            >
              {cost.toLocaleString()}
            </span>
          </div>

          {!canAfford && (
            <p className="text-red-400 mt-1" style={{ fontSize: fontSize.xs }}>
              Not enough coins!
            </p>
          )}

          <div className="flex gap-3 justify-center mt-4">
            <GameButton onClick={onCancel} variant="secondary" size="sm">
              CANCEL
            </GameButton>
            <GameButton onClick={onConfirm} disabled={!canAfford} size="sm">
              BUY
            </GameButton>
          </div>
        </GameCard>
      </div>
    </div>
  );
}
