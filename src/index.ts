/* eslint-disable  func-names */
/* eslint-disable  no-console */
// tslint:disable-next-line: no-var-requires
const i18n = require("i18next");
import { Response, SessionEndedRequest } from "ask-sdk-model";
import {
  SkillBuilders,
  RequestInterceptor,
  RequestHandler,
  HandlerInput,
  ErrorHandler,
} from "ask-sdk-core";
// tslint:disable-next-line: no-var-requires
import i18next from "i18next";

import * as sprintf from "i18next-sprintf-postprocessor";
import { RequestAttributes } from "./interfaces";
import { getRandomItem } from "./lib/helpers";
import { recipes } from "./recipes";

/* INTENT HANDLERS */
class LaunchRequestHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  }
  public handle(handlerInput: HandlerInput): Response {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const item = requestAttributes.t(getRandomItem(Object.keys(recipes.RECIPE_EN_US)));

    const speakOutput = requestAttributes.t("WELCOME_MESSAGE", requestAttributes.t("SKILL_NAME"), item);
    const repromptOutput = requestAttributes.t("WELCOME_REPROMPT");

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  }
}

class RecipeHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "RecipeIntent";
  }
  public handle(handlerInput: HandlerInput): Response {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (handlerInput.requestEnvelope.request.type !== "IntentRequest" || handlerInput.requestEnvelope.request.intent.slots === undefined) {
      throw new Error("Unexpected Error");
    }

    const itemSlot = handlerInput.requestEnvelope.request.intent.slots!.Item;
    let itemName: string;
    if (itemSlot && itemSlot.value) {
      itemName = itemSlot.value.toLowerCase();
    } else {
      throw new Error("Slot.Item not found");
    }

    const cardTitle = requestAttributes.t("DISPLAY_CARD_TITLE", requestAttributes.t("SKILL_NAME"), itemName);
    const myRecipes = requestAttributes.t("RECIPES");
    const recipe = myRecipes[itemName];
    let speakOutput = "";

    if (recipe) {
      sessionAttributes.speakOutput = recipe;
      // uncomment the _2_ reprompt lines if you want to repeat the info
      // and prompt for a subsequent action
      // sessionAttributes.repromptSpeech = requestAttributes.t('RECIPE_REPEAT_MESSAGE');
      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

      return handlerInput.responseBuilder
        .speak(sessionAttributes.speakOutput)
        // .reprompt(sessionAttributes.repromptSpeech)
        .withSimpleCard(cardTitle, recipe)
        .getResponse();
    }
    const repromptSpeech = requestAttributes.t("RECIPE_NOT_FOUND_REPROMPT");
    if (itemName) {
      speakOutput += requestAttributes.t("RECIPE_NOT_FOUND_WITH_ITEM_NAME", itemName);
    } else {
      speakOutput += requestAttributes.t("RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME");
    }
    speakOutput += repromptSpeech;

    // save outputs to attributes, so we can use it to repeat
    sessionAttributes.speakOutput = speakOutput;
    sessionAttributes.repromptSpeech = repromptSpeech;

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  }
}

class HelpHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent";
  }
  public handle(handlerInput: HandlerInput): Response {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const item = requestAttributes.t(getRandomItem(Object.keys(recipes.RECIPE_EN_US)));

    sessionAttributes.speakOutput = requestAttributes.t("HELP_MESSAGE", item);
    sessionAttributes.repromptSpeech = requestAttributes.t("HELP_REPROMPT", item);

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  }
}

class RepeatHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
      && handlerInput.requestEnvelope.request.intent.name === "AMAZON.RepeatIntent";
  }
  public handle(handlerInput: HandlerInput): Response {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  }
}

class ExitHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      (request.intent.name === "AMAZON.CancelIntent" ||
        request.intent.name === "AMAZON.StopIntent")
    );
  }
  public handle(handlerInput: HandlerInput): Response {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const speakOutput = requestAttributes.t("STOP_MESSAGE", requestAttributes.t("SKILL_NAME"));

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
}

class SessionEndedRequestHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "SessionEndedRequest";
  }
  public handle(handlerInput: HandlerInput): Response {
    if (handlerInput.requestEnvelope.request.type === "SessionEndedRequest") {
      const request: SessionEndedRequest = handlerInput.requestEnvelope.request;
      console.log(`Session ended with reason: ${request.reason}`);
    }
    return handlerInput.responseBuilder.getResponse();
  }
}

class CustomErrorHandler implements ErrorHandler {
  public canHandle(_handlerInput: HandlerInput): boolean {
    return true;
  }
  public handle(handlerInput: HandlerInput, error: Error): Response {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);

    return handlerInput.responseBuilder
      .speak("Sorry, I can't understand the command. Please say again.")
      .reprompt("Sorry, I can't understand the command. Please say again.")
      .getResponse();
  }
}

type TranslationFunction = (...args: any[]) => string;

/**
 * Adds translation functions to the RequestAttributes.
 */
export class LocalizationInterceptor implements RequestInterceptor {
  public async process(handlerInput: HandlerInput): Promise<void> {
    const t = await i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler:
        sprintf.overloadTranslationOptionHandler,
      resources: languageStrings,
      returnObjects: true,
    });

    const attributes = handlerInput.attributesManager.getRequestAttributes() as RequestAttributes;
    attributes.t = (...args: any[]) => {
      return (t as TranslationFunction)(...args);
    };
    attributes.tr = (key: any) => {
      const result = t(key) as string[];
      return getRandomItem(result);
    };
  }
}

/* LAMBDA SETUP */
const skillBuilder = SkillBuilders.custom();
exports.handler = skillBuilder
  .addRequestHandlers(
    new LaunchRequestHandler(),
    new RecipeHandler(),
    new HelpHandler(),
    new RepeatHandler(),
    new ExitHandler(),
    new SessionEndedRequestHandler(),
  )
  .addRequestInterceptors(new LocalizationInterceptor())
  .addErrorHandlers(new CustomErrorHandler())
  .lambda();

// langauge strings for localization
// TODO: The items below this comment need your attention

export enum Strings {
  RECIPES = "RECIPES",
  SKILL_NAME = "SKILL_NAME",
  WELCOME_MESSAGE = "WELCOME_MESSAGE",
  WELCOME_REPROMPT = "WELCOME_REPROMPT",
  DISPLAY_CARD_TITLE = "DISPLAY_CARD_TITLE",
  HELP_MESSAGE = "HELP_MESSAGE",
  HELP_REPROMPT = "HELP_REPROMPT",
  STOP_MESSAGE = "STOP_MESSAGE",
  RECIPE_REPEAT_MESSAGE = "RECIPE_REPEAT_MESSAGE",
  RECIPE_NOT_FOUND_WITH_ITEM_NAME = "RECIPE_NOT_FOUND_WITH_ITEM_NAME",
  RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME = "RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME",
  RECIPE_NOT_FOUND_REPROMPT = "RECIPE_NOT_FOUND_REPROMPT",
}
interface IRegionStrings {
  [Strings.RECIPES]: { [key: string]: string };
  [Strings.SKILL_NAME]: string;
}
interface ILangStrings extends IRegionStrings {
  [Strings.WELCOME_MESSAGE]?: string;
  [Strings.WELCOME_REPROMPT]?: string;
  [Strings.DISPLAY_CARD_TITLE]?: string;
  [Strings.HELP_MESSAGE]?: string;
  [Strings.HELP_REPROMPT]?: string;
  [Strings.STOP_MESSAGE]?: string;
  [Strings.RECIPE_REPEAT_MESSAGE]?: string;
  [Strings.RECIPE_NOT_FOUND_WITH_ITEM_NAME]?: string;
  [Strings.RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME]?: string;
  [Strings.RECIPE_NOT_FOUND_REPROMPT]?: string;
}

const enData: i18next.ResourceLanguage = {
  translation: {
    RECIPES: recipes.RECIPE_EN_US,
    SKILL_NAME: "Minecraft Helper",
    WELCOME_MESSAGE: "Welcome to %s. You can ask a question like, what's the recipe for a %s? ... Now, what can I help you with?",
    WELCOME_REPROMPT: "For instructions on what you can say, please say help me.",
    DISPLAY_CARD_TITLE: "%s  - Recipe for %s.",
    HELP_MESSAGE: "You can ask questions such as, what's the recipe for a %s, or, you can say exit...Now, what can I help you with?",
    HELP_REPROMPT: "You can say things like, what's the recipe for a %s, or you can say exit...Now, what can I help you with?",
    STOP_MESSAGE: "Goodbye!",
    RECIPE_REPEAT_MESSAGE: "Try saying repeat.",
    RECIPE_NOT_FOUND_WITH_ITEM_NAME: "I'm sorry, I currently do not know the recipe for %s. ",
    RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME: "I'm sorry, I currently do not know that recipe. ",
    RECIPE_NOT_FOUND_REPROMPT: "What else can I help with?",
  } as ILangStrings,
};

const enusData: i18next.ResourceLanguage = {
  translation: {
    RECIPES: recipes.RECIPE_EN_US,
    SKILL_NAME: "American Minecraft Helper",
  } as IRegionStrings,
};

const engbData: i18next.ResourceLanguage = {
  translation: {
    RECIPES: recipes.RECIPE_EN_GB,
    SKILL_NAME: "British Minecraft Helper",
  } as IRegionStrings,
};

const deData: i18next.ResourceLanguage = {
  translation: {
    RECIPES: recipes.RECIPE_DE_DE,
    SKILL_NAME: "Assistent für Minecraft in Deutsch",
    WELCOME_MESSAGE: "Willkommen bei %s. Du kannst beispielsweise die Frage stellen: Welche Rezepte gibt es für eine %s? ... Nun, womit kann ich dir helfen?",
    WELCOME_REPROMPT: "Wenn du wissen möchtest, was du sagen kannst, sag einfach „Hilf mir“.",
    DISPLAY_CARD_TITLE: "%s - Rezept für %s.",
    HELP_MESSAGE: "Du kannst beispielsweise Fragen stellen wie „Wie geht das Rezept für eine %s“ oder du kannst „Beenden“ sagen ... Wie kann ich dir helfen?",
    HELP_REPROMPT: "Du kannst beispielsweise Sachen sagen wie „Wie geht das Rezept für eine %s“ oder du kannst „Beenden“ sagen ... Wie kann ich dir helfen?",
    STOP_MESSAGE: "Auf Wiedersehen!",
    RECIPE_REPEAT_MESSAGE: "Sage einfach „Wiederholen“.",
    RECIPE_NOT_FOUND_WITH_ITEM_NAME: "Tut mir leid, ich kenne derzeit das Rezept für %s nicht. ",
    RECIPE_NOT_FOUND_WITHOUT_ITEM_NAME: "Tut mir leid, ich kenne derzeit dieses Rezept nicht. ",
    RECIPE_NOT_FOUND_REPROMPT: "Womit kann ich dir sonst helfen?",
  } as IRegionStrings,
};

const languageStrings: i18next.Resource = {
  "en": enData,
  "en-US": enusData,
  "en-GB": engbData,
  "de": deData,
};