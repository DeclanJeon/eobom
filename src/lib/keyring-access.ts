import { isOwnerDevice } from "@/lib/seats";

export type KeyringSeatLike = {
  status: string;
  claimedUserId: string | null;
};

export type KeyringAccess =
  | { kind: "not_found" }
  | { kind: "revoked" }
  | { kind: "owner_home" } // claimed + 본인 로그인 (기기 등록은 라우트 경유)
  | { kind: "claim_prompt" } // unclaimed + 로그인 — 명시적 동의만
  | { kind: "blocked_other" } // claimed + 타인 로그인
  | { kind: "owner_legacy" } // legacyOwner + 본인
  | { kind: "blocked_legacy_other" } // legacyOwner + 타인
  | { kind: "owner_login_prompt" } // claimed + 게스트 + 소유자 기기
  | { kind: "private_page" } // claimed + 게스트 + 비소유자 기기
  | { kind: "first_register" }; // unclaimed + 게스트

/**
 * 키링 접근 결정 — 렌더링과 분리해 테스트 가능하게 만든다.
 * 비소유자에게 어떤 정보도 노출하지 않는 것이 핵심 불변식이다.
 */
export async function decideKeyringAccess(opts: {
  seat: KeyringSeatLike | null;
  legacyOwner: { id: string } | null;
  viewer: { id: string } | null;
  deviceHash: string | null;
}): Promise<KeyringAccess> {
  const { seat, legacyOwner, viewer, deviceHash } = opts;

  if (!seat && !legacyOwner) return { kind: "not_found" };
  if (seat?.status === "revoked") return { kind: "revoked" };

  if (viewer && seat) {
    if (seat.claimedUserId === viewer.id && seat.status === "claimed") {
      return { kind: "owner_home" };
    }
    if (seat.status === "unclaimed") return { kind: "claim_prompt" };
    if (seat.claimedUserId && seat.claimedUserId !== viewer.id) {
      return { kind: "blocked_other" };
    }
  }

  if (viewer && legacyOwner) {
    return viewer.id === legacyOwner.id
      ? { kind: "owner_legacy" }
      : { kind: "blocked_legacy_other" };
  }

  // Guest
  const isClaimed =
    (seat && seat.status === "claimed") || Boolean(legacyOwner);
  if (!viewer && isClaimed) {
    if (seat?.status === "claimed" && seat.claimedUserId) {
      const ownerDevice = await isOwnerDevice(seat.claimedUserId, deviceHash);
      if (ownerDevice) return { kind: "owner_login_prompt" };
    }
    return { kind: "private_page" };
  }

  return { kind: "first_register" };
}
