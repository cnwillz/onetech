<template>
  <div class="lettersRecipe">
    <h2>字母合成表</h2>
    <h3>用于放置字母在牌子上</h3>

    <div class="signSizes">
      <div class="signSize" :class="{selected: small}" @click="selectSmall">小牌子</div>
      <div class="signSize" :class="{selected: !small}" @click="selectBig">大牌子</div>
    </div>

    <textarea class="message" id="messageArea" @keyup="update" :rows="rows" :cols="cols+1" :maxLength="maxLength" autofocus autocomplete="off" autocorrect="off" spellcheck="false"></textarea>

    <h3 v-if="loading">加载中...</h3>
    <div v-else-if="objects.length" class="steps">
      <RecipeIngredients :ingredients="ingredients" :rightClickObject="filterObject" />

      <div class="filterHeadline" v-if="filteredObject">
        <h4>筛选:</h4>
        <ObjectImage
          class="filteredObject"
          hover="true"
          clickable="true"
          :object="filteredObject" />
        <a href="#" @click.prevent="filterObject(null)">清除筛选</a>
      </div>

      <RecipeStep
        v-for="(transitions, index) in steps"
        :transitions="transitions"
        :number="index+1"
        :key="index"
        :rightClickObject="filterObject"
        :filteredObject="filteredObject"
        :highlightObjects="objects" />
    </div>
  </div>
</template>

<script>
import GameObject from '../models/GameObject';

import RecipeIngredients from './RecipeIngredients';
import RecipeStep from './RecipeStep';
import ObjectImage from './ObjectImage';

export default {
  components: {
    RecipeIngredients,
    RecipeStep,
    ObjectImage
  },
  data() {
    return {
      small: true,
      objects: [],
      timer: null,
      filteredObject: null,
    };
  },
  computed: {
    rows() {
      return this.small ? 2 : 3;
    },
    cols() {
      return this.small ? 7 : 9;
    },
    maxLength() {
      return this.rows*this.cols+(this.rows-1)*2;
    },
    loading() {
      return this.timer || this.objects.filter(o => !o.data).length > 0;
    },
    ingredients() {
      const tools = ["34", "135", "235", "730"];
      let ingredients = [];
      for (let object of this.objects) {
        ingredients = ingredients.concat(object.data.recipe.ingredients);
      }
      return ingredients.filter((id,i) => !tools.includes(id) || ingredients.indexOf(id) == i);
    },
    steps() {
      let transitions = [];
      for (let object of this.objects) {
        const steps = object.data.recipe.steps;
        for (let stepIndex=0; stepIndex < steps.length; stepIndex++) {
          for (let transition of steps[steps.length-stepIndex-1]) {
            this.addTransition(transition, transitions, stepIndex);
          }
        }
      }
      let steps = [];
      for (let transition of transitions) {
        if (!steps[transition.stepIndex])
          steps[transition.stepIndex] = [];
        steps[transition.stepIndex].push(transition);
      }
      return steps.reverse();
    }
  },
  methods: {
    selectBig() {
      this.small = false;
      this.fixMessage();
      this.updateObjects();
    },
    selectSmall() {
      this.small = true;
      this.fixMessage();
      this.updateObjects();
    },
    update(event) {
      this.fixMessage();
      if (this.timer)
        clearTimeout(this.timer);
      this.timer = setTimeout(() => this.updateObjects(), 500);
    },
    fixMessage() {
      const textarea = document.getElementById("messageArea");
      if (!textarea.value) return;
      const rowRegex = new RegExp(`.{1,${this.cols}}`, "g");
      const length = textarea.value.length;
      let selectionStart = textarea.selectionStart;
      let selectionEnd = textarea.selectionEnd;
      textarea.value = textarea.value.toUpperCase()
        .replace(/ /g, "-")
        .replace("–", "--") // Some systems convert -- to en dash
        .replace("—", "--") // Some systems convert -- to em dash
        .replace(/[^A-Z-]/g, "")
        .match(rowRegex)
        .join("\r\n")
        .substring(0, this.maxLength);
      if (textarea.value.length > length) {
        selectionStart += 2;
        selectionEnd += 2;
      }
      textarea.selectionStart = selectionStart;
      textarea.selectionEnd = selectionEnd;
    },
    updateObjects() {
      let textarea = document.getElementById("messageArea");
      this.objects = textarea.value.split("").map(this.letterToObject).filter(o => o);
      this.timer = null;
    },
    addTransition(transition, transitions, stepIndex) {
      let match = transitions.find(t => t.id == transition.id);
      if (match) {
        match.count += transition.count || 1;
        match.uses = "x" + match.count;
        if (match.stepIndex < stepIndex) {
          match.stepIndex = stepIndex;
        }
      } else {
        let clone = Object.assign({count: 1, stepIndex: stepIndex}, transition);
        transitions.push(clone);
      }
    },
    letterToObject(letter) {
      if (letter == "-")
        return GameObject.findAndLoadByName("Hyphen");
      return GameObject.findAndLoadByName(`Letter ${letter}`);
    },
    filterObject(object) {
      this.filteredObject = object;
      if (object) {
        setTimeout(function() {
          var scrollingElement = (document.scrollingElement || document.body);
          scrollingElement.scrollTop = scrollingElement.scrollHeight;
        }, 100);
      }
    }
  },
  metaInfo() {
    return {title: `Recipe for Letters`};
  }
}
</script>

<style lang="scss" scoped>
  .lettersRecipe {
    background-color: #222;
    margin-top: 10px;
    border-radius: 5px;
    padding-top: 1px;
    padding-bottom: 20px;
  }

  .lettersRecipe > h2 {
    text-align: center;
    font-weight: bolder;
    margin-bottom: 0px;
  }

  .lettersRecipe h3 {
    text-align: center;
    font-weight: lighter;
    font-style: italic;
    margin-top: 0px;
  }

  .lettersRecipe .signSizes {
    display: flex;
    justify-content: center;
    margin-bottom: 15px;
  }

  .lettersRecipe .signSize {
    background-color: #333;
    padding: 4px 10px;
    border: solid 1px #555;
    cursor: pointer;
  }
  .lettersRecipe .signSize.selected {
    background-color: #555;
    cursor: default;
  }
  .lettersRecipe .signSize:first-child {
    border-right: none;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
  }
  .lettersRecipe .signSize:last-child {
    border-left: none;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
  }

  .lettersRecipe .message {
    resize: none;
    display: block;
    margin: 10px auto;
    padding: 10px;
    background-color: #ccc;
    border-radius: 10px;
    font-family: FreeMono, Courier, monospace;
    font-size: 30px;
  }

  .lettersRecipe .steps {
    display: flex;
    flex-direction: column;
  }

  .filterHeadline {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 5px;

    h4 {
      text-align: center;
      font-size: 16px;
      margin: 0;
    }

    .filteredObject {
      margin: 0 10px;
      display: flex;
      align-items: center;
      z-index: 1;
      position: relative;
      display: block;
      width: 50px;
      height: 50px;
      background-color: #444;
      border: solid 1px transparent;
      border-radius: 3px;
      &:hover {
        border-color: #aaa;
        background-color: #666;
      }
    }
  }

  .clearFilter {
    text-align: center;
  }
</style>
