import { Compiler } from 'inkjs/full';
import type { LanguageCode } from '../core/i18n';

export interface DialogueChoice {
  index: number;
  text: string;
}

export interface ActiveDialogue {
  npcId: 'zoryana' | 'miroslav';
  speaker: string;
  line: string;
  choices: DialogueChoice[];
}

export interface ContractProgress {
  stage: 'intro' | 'shrine' | 'boss' | 'endless';
  zoryanaHelped: boolean;
  shrineExamined: boolean;
  leshySlain: boolean;
  endlessWavesCleared: number;
}

// InkJS branching contract script
const INK_SOURCE = `
VAR stage = "intro"
VAR helped_zoryana = false
VAR shrine_examined = false
VAR leshy_slain = false
VAR reward_silver = 0
VAR reward_herbs = 0

=== zoryana ===
{
  - leshy_slain:
    -> zoryana_post
  - helped_zoryana:
    -> zoryana_ally
  - else:
    -> zoryana_first
}

=== zoryana_first ===
ZORYANA_GREET
* [CHOICE_ZORYANA_GIFT]
  ~ helped_zoryana = true
  ~ reward_herbs = 2
  ZORYANA_BROTHER_THANKS
  -> END
* [CHOICE_ZORYANA_ASK_PACT]
  ZORYANA_REVEALS_ELDER
  -> END
* [CHOICE_LEAVE]
  -> END

=== zoryana_ally ===
ZORYANA_ALLY_LINE
* [CHOICE_ZORYANA_BREW]
  ~ reward_herbs = 1
  ZORYANA_GIVES_HERB
  -> END
* [CHOICE_LEAVE]
  -> END

=== zoryana_post ===
ZORYANA_VICTORY
-> END

=== miroslav ===
{
  - leshy_slain:
    -> miroslav_victory
  - shrine_examined:
    -> miroslav_confront
  - else:
    -> miroslav_contract
}

=== miroslav_contract ===
MIROSLAV_HIRE
* [CHOICE_MIROSLAV_ACCEPT]
  ~ stage = "shrine"
  MIROSLAV_SENDS_NORTH
  -> END
* [CHOICE_MIROSLAV_HAGGLE]
  ~ reward_silver = 40
  ~ stage = "shrine"
  MIROSLAV_PAYS_ADVANCE
  -> END
* [CHOICE_LEAVE]
  -> END

=== miroslav_confront ===
MIROSLAV_GUILTY
* [CHOICE_SPARE_FOR_SILVER]
  ~ reward_silver = 90
  ~ stage = "boss"
  MIROSLAV_BARGAIN
  -> END
* [CHOICE_BURN_PACT]
  ~ stage = "boss"
  MIROSLAV_CURSED
  -> END

=== miroslav_victory ===
MIROSLAV_ENDLESS
-> END
`;

const DIALOGUE_LOCALIZED: Record<string, { en: string; ru: string }> = {
  ZORYANA_GREET: {
    en: 'Crow’s Eye dries slowly in this cursed fog. Miroslav thinks gold buys silence, yet the bog takes blood first.',
    ru: 'Вороний глаз едва сохнет в этом мороке. Мирослав верит, будто серебро купит тишину — да болото берёт кровью.',
  },
  ZORYANA_BROTHER_THANKS: {
    en: 'Take these marsh herbs for your blade oils. Follow the claw trail north toward the Zbruch idol.',
    ru: 'Возьми болотные травы для масел. Иди по когтистому следу на север — к идолу Збруча.',
  },
  ZORYANA_REVEALS_ELDER: {
    en: 'Use your Vedun Sense [E] at the Zbruch stones. You will smell whose blood sealed the Leshy’s oath.',
    ru: 'Включи ведунье чутьё [E] у камней Збруча — сразу почуешь, чьей кровью скреплена клятва Лешему.',
  },
  ZORYANA_ALLY_LINE: {
    en: 'The Nav Brand burns brighter on your chest. Keep your Swallow draught close.',
    ru: 'Метка Нави горит ярче на твоей груди. Держи отвар Ласточки под рукой.',
  },
  ZORYANA_GIVES_HERB: {
    en: 'Fresh hellebore from the creek—coat your silver blade before facing the antlers.',
    ru: 'Свежий чемеричник с ручья — смажь серебряный клинок перед рогатым зверем.',
  },
  ZORYANA_VICTORY: {
    en: 'The village breathes tonight, Vedun. Yet dark currents still stir beneath the flooded barrow.',
    ru: 'Село перевело дух, ведун. Но под затопленным курганом всё ещё шевелится чёрная Навь.',
  },
  MIROSLAV_HIRE: {
    en: 'Stray wolf or ancient demon—clear the northern mire and silver sits on my table. Do not dig where you are not paid.',
    ru: 'Волк ли, нечисть древняя — очисти северную топь, и серебро ляжет на стол. Не суй нос туда, за что не платят.',
  },
  MIROSLAV_SENDS_NORTH: {
    en: 'The Upyr pack gathers past the Zbruch idol. Slay the Ancient Leshy and the mire is yours.',
    ru: 'Стая упырей сбилась за идолом Збруча. Убей Древнего Лешего — и получишь награду.',
  },
  MIROSLAV_PAYS_ADVANCE: {
    en: 'Sharp tongue, Vedun. Forty silver up front—bring me the antlers by dawn.',
    ru: 'Остёр на язык, ведун. Сорок серебряных вперёд — к рассвету принеси рога твари.',
  },
  MIROSLAV_GUILTY: {
    en: 'So your cursed eyes saw the oath-stone... We were starving! One pact kept winter out of our huts!',
    ru: 'Значит, твои проклятые глаза увидели камень клятвы... Мы голодали! Один обет спас избы от зимы!',
  },
  MIROSLAV_BARGAIN: {
    en: 'Ninety silver, and you break the Leshy’s heart without burning my name. Deal?',
    ru: 'Девяносто серебряных — ты рубишь Лешего и молчишь о моём имени. По рукам?',
  },
  MIROSLAV_CURSED: {
    en: 'May Nav drag you under then! The Leshy will tear iron and silver alike!',
    ru: 'Тогда пусть Навь заберёт и тебя! Леший разорвёт и сталь, и серебро!',
  },
  MIROSLAV_ENDLESS: {
    en: 'The Leshy fell, yet fresh Nav packs roam every dusk and midnight. Every trophy pays heavy silver.',
    ru: 'Леший пал, но каждую ночь Навь гонит новые стаи. За каждый трофей волость платит серебром.',
  },
  CHOICE_ZORYANA_GIFT: {
    en: 'Offer 20 Silver for her brother’s medicine',
    ru: 'Отдать 20 серебра на лекарство брату',
  },
  CHOICE_ZORYANA_ASK_PACT: {
    en: 'Ask about the village’s curse',
    ru: 'Спросить о проклятии волости',
  },
  CHOICE_ZORYANA_BREW: {
    en: 'Ask for marsh herbs',
    ru: 'Попросить болотных трав',
  },
  CHOICE_MIROSLAV_ACCEPT: {
    en: 'Take the Leshy contract',
    ru: 'Взять заказ на Лешего',
  },
  CHOICE_MIROSLAV_HAGGLE: {
    en: 'Demand silver up front (+40 Silver)',
    ru: 'Потребовать задаток (+40 серебра)',
  },
  CHOICE_SPARE_FOR_SILVER: {
    en: 'Keep his secret (+90 Silver)',
    ru: 'Скрыть сделку старосты (+90 серебра)',
  },
  CHOICE_BURN_PACT: {
    en: 'Condemn the blood oath (Shrine Power)',
    ru: 'Проклясть кровавый обет (Сила капища)',
  },
  CHOICE_LEAVE: {
    en: 'Farewell',
    ru: 'Прощай',
  },
};

function translateDialogueKey(raw: string, lang: LanguageCode): string {
  const key = raw.trim();
  const entry = DIALOGUE_LOCALIZED[key];
  if (!entry) return key;
  return lang === 'ru' || lang === 'uk' ? entry.ru : entry.en;
}

export class ContractNarrativeEngine {
  private readonly story;
  public progress: ContractProgress = {
    stage: 'intro',
    zoryanaHelped: false,
    shrineExamined: false,
    leshySlain: false,
    endlessWavesCleared: 0,
  };

  constructor() {
    this.story = new Compiler(INK_SOURCE).Compile();
  }

  private syncVarsToInk(): void {
    this.story.variablesState['stage'] = this.progress.stage;
    this.story.variablesState['helped_zoryana'] = this.progress.zoryanaHelped;
    this.story.variablesState['shrine_examined'] = this.progress.shrineExamined;
    this.story.variablesState['leshy_slain'] = this.progress.leshySlain;
    this.story.variablesState['reward_silver'] = 0;
    this.story.variablesState['reward_herbs'] = 0;
  }

  startNpcDialogue(npcId: 'zoryana' | 'miroslav', lang: LanguageCode): ActiveDialogue {
    this.syncVarsToInk();
    this.story.ChoosePathString(npcId);
    return this.advanceInk(npcId, lang);
  }

  chooseOption(
    npcId: 'zoryana' | 'miroslav',
    choiceIdx: number,
    lang: LanguageCode,
  ): { next: ActiveDialogue | null; rewardSilver: number; rewardHerbs: number; stageChanged: boolean } {
    this.story.ChooseChoiceIndex(choiceIdx);
    const prevStage = this.progress.stage;
    const next = this.advanceInk(npcId, lang);

    const rewardSilver = Number(this.story.variablesState['reward_silver'] ?? 0);
    const rewardHerbs = Number(this.story.variablesState['reward_herbs'] ?? 0);
    const nextStage = String(this.story.variablesState['stage'] ?? prevStage) as ContractProgress['stage'];
    const helped = Boolean(this.story.variablesState['helped_zoryana']);

    this.progress.zoryanaHelped = helped;
    if (nextStage === 'shrine' || nextStage === 'boss' || nextStage === 'endless') {
      this.progress.stage = nextStage;
    }

    const closed = next.line.length === 0 && next.choices.length === 0;
    return {
      next: closed ? null : next,
      rewardSilver,
      rewardHerbs,
      stageChanged: prevStage !== this.progress.stage,
    };
  }

  private advanceInk(npcId: 'zoryana' | 'miroslav', lang: LanguageCode): ActiveDialogue {
    const lines: string[] = [];
    while (this.story.canContinue) {
      const text = this.story.Continue();
      if (text && text.trim().length > 0) {
        lines.push(translateDialogueKey(text, lang));
      }
    }
    const choices: DialogueChoice[] = this.story.currentChoices.map((c) => ({
      index: c.index,
      text: translateDialogueKey(c.text, lang),
    }));
    const speaker =
      npcId === 'zoryana'
        ? lang === 'ru'
          ? 'ЗНАХАРКА ЗОРЯНА'
          : 'ZORYANA THE HERBALIST'
        : lang === 'ru'
          ? 'СТАРОСТА МИРОСЛАВ'
          : 'ELDER MIROSLAV';
    return {
      npcId,
      speaker,
      line: lines.join(' '),
      choices,
    };
  }
}
