"use client"

// [수정] 경로 별칭(@/)을 다시 사용하여 모듈 경로 문제를 해결합니다.
import { useToast } from "@/components/ui/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            onOpenChange={(open) => {
              if (!open) {
                // Toast가 닫힐 때 상태에서 제거되도록 dismiss 호출
                // Radix UI의 onOpenChange는 자동 닫힘, 스와이프, 닫기 버튼 클릭 모두에 반응합니다.
                dismiss(id);
              }
            }}
            duration={2000}
            className="bg-secondary text-secondary-foreground border-primary/30"
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

