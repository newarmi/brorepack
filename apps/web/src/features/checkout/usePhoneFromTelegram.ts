import { shallowRef } from 'vue';

import { useTelegram } from '@/shared/telegram/useTelegram';
import { useToast } from '@/shared/ui/useToast';

/** Телефон получателя из Telegram в один тап */
export const usePhoneFromTelegram = (onPhoneReceived: (phone: string) => void) => {
  const telegram = useTelegram();
  const { showToast } = useToast();

  const isPhoneRequesting = shallowRef(false);

  const requestPhone = async (): Promise<void> => {
    isPhoneRequesting.value = true;
    try {
      const phone = await telegram.requestContact();
      if (!phone) {
        showToast('Номер не получили — введи его вручную');
        return;
      }
      onPhoneReceived(phone);
    } finally {
      isPhoneRequesting.value = false;
    }
  };

  return { isPhoneRequesting, requestPhone };
};

export default usePhoneFromTelegram;
