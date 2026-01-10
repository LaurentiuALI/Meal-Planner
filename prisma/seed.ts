
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Ingredients
  const ingredients = [
  {
    "id": "33370d89-b470-4017-b474-6383b0cf96af",
    "name": "Carne tocata vita-porc 15% grasime Lidl",
    "unit": "g",
    "protein": 19.5,
    "carbs": 0,
    "fat": 10.7,
    "calories": 174,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 500
  },
  {
    "id": "cbb54420-b77b-4e8c-afd1-0714234d32c3",
    "name": "Cartofi pai - congelati rapid - Carrefour",
    "unit": "g",
    "protein": 1.4,
    "carbs": 11,
    "fat": 0.1,
    "calories": 53,
    "fiber": 1.1,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 1000
  },
  {
    "id": "19ea7810-8fbe-4a81-89bb-089b305d2a59",
    "name": "Fasole rosie - Bio Kidney Beans Ready to Eat - Freshona",
    "unit": "g",
    "protein": 7.2,
    "carbs": 11,
    "fat": 0.6,
    "calories": 93,
    "fiber": 6.9,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 255
  },
  {
    "id": "817bf516-7cac-4ed4-9a0d-6e67b428c82d",
    "name": "Ceapa Rosie",
    "unit": "g",
    "protein": 1.2,
    "carbs": 8.3,
    "fat": 0.1,
    "calories": 39,
    "fiber": 1.7,
    "purchaseUnitName": "buc",
    "purchaseUnitAmount": 120
  },
  {
    "id": "aafa7dbc-529b-4e56-a6dd-7a2df4295440",
    "name": "Castraveti Murati simplu",
    "unit": "g",
    "protein": 1.1,
    "carbs": 4.4,
    "fat": 0.5,
    "calories": 29,
    "fiber": 1.2,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 500
  },
  {
    "id": "7675825f-ff63-4efb-b060-91ea305f51b3",
    "name": "High Protein Mature Cheese slices - Milbona (Lidl)",
    "unit": "g",
    "protein": 34.1,
    "carbs": 2.4,
    "fat": 9.9,
    "calories": 237,
    "fiber": 0.9,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 200
  },
  {
    "id": "d4f5464c-2d85-48f0-bb3c-224b325abe6f",
    "name": "Piept pui - Axedum",
    "unit": "g",
    "protein": 19.6,
    "carbs": 0,
    "fat": 2.3,
    "calories": 99.1,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 500
  },
  {
    "id": "baae750e-534f-4d80-9603-5455b619e2b3",
    "name": "Cartofi dulci congelați - Harvest Basket ",
    "unit": "g",
    "protein": 2.3,
    "carbs": 17.3,
    "fat": 7.6,
    "calories": 154,
    "fiber": 3.6,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 450
  },
  {
    "id": "05d435c6-2b25-437e-9747-cd023f37f944",
    "name": "Broccoli congelat Kaufland",
    "unit": "g",
    "protein": 3,
    "carbs": 2,
    "fat": 0,
    "calories": 26,
    "fiber": 3.1,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 450
  },
  {
    "id": "fd5d7bea-32e4-4cf7-9784-7b4055c08264",
    "name": "Parmezan Grana Padano grated - Lovilio (Lidl)",
    "unit": "g",
    "protein": 33,
    "carbs": 0,
    "fat": 29,
    "calories": 398,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 250
  },
  {
    "id": "a86617a9-ce53-4338-93b6-5d79e17c1d56",
    "name": "Iaurt in stil grecesc low fat 2% Milbona",
    "unit": "g",
    "protein": 6,
    "carbs": 4,
    "fat": 2,
    "calories": 58,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 1000
  },
  {
    "id": "ae187812-9e43-476e-91e3-66d377566766",
    "name": "Lentilles linsen freshona",
    "unit": "g",
    "protein": 4,
    "carbs": 10.3,
    "fat": 0.3,
    "calories": 69,
    "fiber": 4,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 400
  },
  {
    "id": "b7d5c63a-0db1-4cf7-8bdf-ea0517d0e95d",
    "name": "Branza fagaras",
    "unit": "g",
    "protein": 11.6,
    "carbs": 3.5,
    "fat": 3,
    "calories": 87,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 200
  },
  {
    "id": "129d7eee-363f-4a88-b302-35fb5a907503",
    "name": "bio organic oat flakes",
    "unit": "g",
    "protein": 14.2,
    "carbs": 55.1,
    "fat": 6.9,
    "calories": 364,
    "fiber": 12.3,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 500
  },
  {
    "id": "6172e74c-db04-442c-b625-874fa0868e8e",
    "name": "Seminte de Chia",
    "unit": "g",
    "protein": 15.8,
    "carbs": 43.8,
    "fat": 30.8,
    "calories": 480,
    "fiber": 37.7,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 100
  },
  {
    "id": "13654c00-acb3-48b4-ab87-a63474d6f107",
    "name": "Hellman’s Original Mayonnaise",
    "unit": "g",
    "protein": 0.6,
    "carbs": 2.9,
    "fat": 73,
    "calories": 671,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 405
  },
  {
    "id": "64ed13e2-1e61-4446-b86e-6a6154cdaf6c",
    "name": "Afine de Cultura camara noastra",
    "unit": "g",
    "protein": 0.6,
    "carbs": 8.4,
    "fat": 0.5,
    "calories": 44,
    "fiber": 1.5,
    "purchaseUnitName": "Pack",
    "purchaseUnitAmount": 400
  },
  {
    "id": "27b5d095-f6db-4053-a41b-c17653815f28",
    "name": "Winterfresh",
    "unit": "g",
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "calories": 0,
    "fiber": 0,
    "purchaseUnitName": "pack",
    "purchaseUnitAmount": 100
  }
];
  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {},
      create: ing
    });
  }

  // 2. Tools
  const tools = [
  {
    "id": "42d2f375-606b-493b-aefb-4f5f94953973",
    "name": "Frying Pan"
  },
  {
    "id": "132c9b6b-d26f-457e-a741-db95652d742a",
    "name": "Saucepan"
  },
  {
    "id": "1a1b86ae-e72d-44af-b7d5-b1a4908a3ea4",
    "name": "Stock Pot"
  },
  {
    "id": "f231265c-db57-4512-bf37-970bddf10203",
    "name": "Oven"
  },
  {
    "id": "6d8741bd-a2f5-404e-a457-e42e2b6c6259",
    "name": "Baking Sheet"
  },
  {
    "id": "9027d3eb-5413-40fd-97f3-5953cdc59596",
    "name": "Knife"
  },
  {
    "id": "2d6ac6d2-42aa-481e-b7f0-32f79abbbe92",
    "name": "Cutting Board"
  },
  {
    "id": "5c7840d1-fc68-4bf4-90ab-9dc64aa475a8",
    "name": "Blender"
  },
  {
    "id": "6580c9d0-4077-4bbe-939d-0aa954a66b53",
    "name": "Food Processor"
  },
  {
    "id": "145d98e0-d128-4c92-9c0b-9391eff5983a",
    "name": "Bowl"
  },
  {
    "id": "12b8eea4-94ae-45b6-a9bc-b9d6186b6103",
    "name": "Whisk"
  },
  {
    "id": "3ca70683-83e9-4d39-af25-b8a4f91b41aa",
    "name": "Tigaie"
  },
  {
    "id": "152001ba-2b6f-4fea-bf3b-9be0043e9b45",
    "name": "Air Fry"
  }
];
  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: {},
      create: {
        id: tool.id,
        name: tool.name
      }
    });
  }

  // 3. Recipes
  const recipes = [
  {
    "id": "79e57178-fc66-4d13-aed8-920815ebe076",
    "name": "Burger Bowl",
    "method": "[]",
    "steps": [
      {
        "id": "080dbdb4-dd25-4c7a-b590-7afd5695967f",
        "recipeId": "79e57178-fc66-4d13-aed8-920815ebe076",
        "description": "",
        "sortOrder": 0,
        "ingredients": [
          {
            "id": "0d8f0c1b-53ae-49c6-9933-8a53ef3022ee",
            "stepId": "080dbdb4-dd25-4c7a-b590-7afd5695967f",
            "ingredientId": "33370d89-b470-4017-b474-6383b0cf96af",
            "amount": 200
          }
        ],
        "tools": [
          {
            "id": "b7299784-cd15-4aab-9e4c-86aee05e360b",
            "stepId": "080dbdb4-dd25-4c7a-b590-7afd5695967f",
            "toolId": "3ca70683-83e9-4d39-af25-b8a4f91b41aa"
          }
        ]
      },
      {
        "id": "314d0c62-0d17-438f-848c-67f17f045d60",
        "recipeId": "79e57178-fc66-4d13-aed8-920815ebe076",
        "description": "",
        "sortOrder": 1,
        "ingredients": [
          {
            "id": "9c71ec3a-307e-45ce-9462-3c6e1de8c785",
            "stepId": "314d0c62-0d17-438f-848c-67f17f045d60",
            "ingredientId": "cbb54420-b77b-4e8c-afd1-0714234d32c3",
            "amount": 300
          }
        ],
        "tools": [
          {
            "id": "e83bed51-a4cd-447d-8d47-98407458b4c2",
            "stepId": "314d0c62-0d17-438f-848c-67f17f045d60",
            "toolId": "152001ba-2b6f-4fea-bf3b-9be0043e9b45"
          }
        ]
      },
      {
        "id": "88669a38-ea30-4f24-8086-d558617a72f6",
        "recipeId": "79e57178-fc66-4d13-aed8-920815ebe076",
        "description": "",
        "sortOrder": 2,
        "ingredients": [
          {
            "id": "30d9226c-574f-4924-ab61-dd8ae74d36ae",
            "stepId": "88669a38-ea30-4f24-8086-d558617a72f6",
            "ingredientId": "817bf516-7cac-4ed4-9a0d-6e67b428c82d",
            "amount": 100
          },
          {
            "id": "f76b64db-4d82-4631-b602-5b7685741d6d",
            "stepId": "88669a38-ea30-4f24-8086-d558617a72f6",
            "ingredientId": "7675825f-ff63-4efb-b060-91ea305f51b3",
            "amount": 20
          },
          {
            "id": "344e4c80-df9f-4a02-9bef-805070bd5cdd",
            "stepId": "88669a38-ea30-4f24-8086-d558617a72f6",
            "ingredientId": "aafa7dbc-529b-4e56-a6dd-7a2df4295440",
            "amount": 200
          },
          {
            "id": "193a55e8-13ce-4650-8c17-ecf7cdb8d1a7",
            "stepId": "88669a38-ea30-4f24-8086-d558617a72f6",
            "ingredientId": "19ea7810-8fbe-4a81-89bb-089b305d2a59",
            "amount": 100
          }
        ],
        "tools": [
          {
            "id": "ba2061ea-8e2a-40f3-af10-71ad21c34f96",
            "stepId": "88669a38-ea30-4f24-8086-d558617a72f6",
            "toolId": "2d6ac6d2-42aa-481e-b7f0-32f79abbbe92"
          },
          {
            "id": "04706744-98e6-4a09-8e80-471b8f77a7bb",
            "stepId": "88669a38-ea30-4f24-8086-d558617a72f6",
            "toolId": "3ca70683-83e9-4d39-af25-b8a4f91b41aa"
          }
        ]
      }
    ]
  },
  {
    "id": "c8da5f11-134d-4817-8208-7176e1b1dc92",
    "name": "Fiber Bowl",
    "method": "[]",
    "steps": [
      {
        "id": "89fbfd15-6137-4897-8e4e-28a870fe504d",
        "recipeId": "c8da5f11-134d-4817-8208-7176e1b1dc92",
        "description": "",
        "sortOrder": 0,
        "ingredients": [
          {
            "id": "1ec76e3d-529f-4034-ac4d-4979e013f320",
            "stepId": "89fbfd15-6137-4897-8e4e-28a870fe504d",
            "ingredientId": "a86617a9-ce53-4338-93b6-5d79e17c1d56",
            "amount": 300
          },
          {
            "id": "ba4b2d18-1cd7-4d15-b456-cb2de4d08bb9",
            "stepId": "89fbfd15-6137-4897-8e4e-28a870fe504d",
            "ingredientId": "129d7eee-363f-4a88-b302-35fb5a907503",
            "amount": 40
          },
          {
            "id": "c8572d63-0320-4169-8283-7e481e4aff9f",
            "stepId": "89fbfd15-6137-4897-8e4e-28a870fe504d",
            "ingredientId": "6172e74c-db04-442c-b625-874fa0868e8e",
            "amount": 10
          },
          {
            "id": "c3b4eca7-1b03-4b67-97fc-d2273fcace75",
            "stepId": "89fbfd15-6137-4897-8e4e-28a870fe504d",
            "ingredientId": "64ed13e2-1e61-4446-b86e-6a6154cdaf6c",
            "amount": 100
          }
        ],
        "tools": [
          {
            "id": "0688179e-4679-4803-8a3d-05f1e7806b0e",
            "stepId": "89fbfd15-6137-4897-8e4e-28a870fe504d",
            "toolId": "145d98e0-d128-4c92-9c0b-9391eff5983a"
          }
        ]
      }
    ]
  },
  {
    "id": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
    "name": "Piept pui cu cartof dulce si broccoli",
    "method": "[]",
    "steps": [
      {
        "id": "38a37d35-e94d-4d38-be4b-6ea18eaf540e",
        "recipeId": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
        "description": "",
        "sortOrder": 0,
        "ingredients": [
          {
            "id": "a65da47b-36bf-48bc-984f-faf8ef7c2583",
            "stepId": "38a37d35-e94d-4d38-be4b-6ea18eaf540e",
            "ingredientId": "baae750e-534f-4d80-9603-5455b619e2b3",
            "amount": 200
          }
        ],
        "tools": [
          {
            "id": "520e9eef-32ff-4b55-b612-441e03de05ff",
            "stepId": "38a37d35-e94d-4d38-be4b-6ea18eaf540e",
            "toolId": "152001ba-2b6f-4fea-bf3b-9be0043e9b45"
          }
        ]
      },
      {
        "id": "b1455ba7-ec0f-4480-8085-a31fa7ae78fc",
        "recipeId": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
        "description": "",
        "sortOrder": 1,
        "ingredients": [
          {
            "id": "aae56f32-4cf2-4f67-9017-9a514a44e665",
            "stepId": "b1455ba7-ec0f-4480-8085-a31fa7ae78fc",
            "ingredientId": "d4f5464c-2d85-48f0-bb3c-224b325abe6f",
            "amount": 200
          }
        ],
        "tools": [
          {
            "id": "c81e1c39-4158-4213-88ba-1a6f8239e62e",
            "stepId": "b1455ba7-ec0f-4480-8085-a31fa7ae78fc",
            "toolId": "3ca70683-83e9-4d39-af25-b8a4f91b41aa"
          }
        ]
      },
      {
        "id": "82c1e77a-8730-4b92-bf19-d179cf4525c5",
        "recipeId": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
        "description": "",
        "sortOrder": 2,
        "ingredients": [
          {
            "id": "87837362-b40e-40d5-a734-d2b603bbef93",
            "stepId": "82c1e77a-8730-4b92-bf19-d179cf4525c5",
            "ingredientId": "05d435c6-2b25-437e-9747-cd023f37f944",
            "amount": 450
          }
        ],
        "tools": [
          {
            "id": "c4dab268-38ef-48bb-8344-63543468e569",
            "stepId": "82c1e77a-8730-4b92-bf19-d179cf4525c5",
            "toolId": "152001ba-2b6f-4fea-bf3b-9be0043e9b45"
          }
        ]
      },
      {
        "id": "f56dd5fb-9434-4b84-bfe0-0dd50c2fbf76",
        "recipeId": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
        "description": "",
        "sortOrder": 3,
        "ingredients": [
          {
            "id": "d5270ef7-2344-4fe8-be44-9d096ae323c5",
            "stepId": "f56dd5fb-9434-4b84-bfe0-0dd50c2fbf76",
            "ingredientId": "fd5d7bea-32e4-4cf7-9784-7b4055c08264",
            "amount": 30
          }
        ],
        "tools": []
      }
    ]
  }
];
  for (const recipe of recipes) {
    // Check if recipe exists
    const existing = await prisma.recipe.findUnique({ where: { id: recipe.id } });
    if (!existing) {
      await prisma.recipe.create({
        data: {
          id: recipe.id,
          name: recipe.name,
          method: recipe.method, // JSON string
          steps: {
            create: recipe.steps.map(s => ({
              id: s.id,
              description: s.description,
              sortOrder: s.sortOrder,
              ingredients: {
                create: s.ingredients.map(ri => ({
                  ingredientId: ri.ingredientId,
                  amount: ri.amount
                }))
              },
              tools: {
                create: s.tools.map(t => ({
                  toolId: t.toolId
                }))
              }
            }))
          }
        }
      });
    }
  }

  // 4. Settings
  const settings = {
  "id": "global",
  "calorieTarget": 2000,
  "proteinTarget": 150,
  "carbsTarget": 200,
  "fatTarget": 60,
  "fiberTarget": 30
};
  if (settings) {
    await prisma.settings.upsert({
      where: { id: settings.id },
      update: settings,
      create: settings
    });
  }
  
  // 5. Templates (simplified seeding)
  const templates = [
  {
    "id": "5605d15c-bbf2-4d1a-b5b6-54ce15d14ad1",
    "name": "Plan 1",
    "isActive": false,
    "createdAt": "2026-01-10T09:25:09.232Z",
    "updatedAt": "2026-01-10T09:51:41.393Z",
    "days": [
      {
        "id": "bc000f04-85af-45f9-bcf1-f1c054a758dd",
        "planTemplateId": "5605d15c-bbf2-4d1a-b5b6-54ce15d14ad1",
        "name": "Picioare",
        "sortOrder": 0,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": []
      },
      {
        "id": "09256d80-0809-4611-89cc-f2ba91fe5e4c",
        "planTemplateId": "5605d15c-bbf2-4d1a-b5b6-54ce15d14ad1",
        "name": "Day 2",
        "sortOrder": 1,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": []
      },
      {
        "id": "bb1ac88c-897b-4db2-82a5-78eb0776d371",
        "planTemplateId": "5605d15c-bbf2-4d1a-b5b6-54ce15d14ad1",
        "name": "Day 3",
        "sortOrder": 2,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": []
      }
    ]
  },
  {
    "id": "47e3c759-5b4e-4242-a68a-934531d000fa",
    "name": "Plan 2",
    "isActive": false,
    "createdAt": "2026-01-10T09:27:22.564Z",
    "updatedAt": "2026-01-10T09:51:45.332Z",
    "days": [
      {
        "id": "aab8381b-8ea6-4887-a187-7291c0ec6ae7",
        "planTemplateId": "47e3c759-5b4e-4242-a68a-934531d000fa",
        "name": "Day 1",
        "sortOrder": 0,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": []
      },
      {
        "id": "cd08c8cb-1570-4a83-ab8d-a6032fd783dd",
        "planTemplateId": "47e3c759-5b4e-4242-a68a-934531d000fa",
        "name": "Day 2",
        "sortOrder": 1,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": []
      },
      {
        "id": "2f89463f-1ca5-4aa1-87ac-b0236aaf5b96",
        "planTemplateId": "47e3c759-5b4e-4242-a68a-934531d000fa",
        "name": "Day 3",
        "sortOrder": 2,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": []
      }
    ]
  },
  {
    "id": "e9dcd476-ec07-45d2-8b6c-587dd50c0bb3",
    "name": "Planul meu",
    "isActive": true,
    "createdAt": "2026-01-10T09:49:13.677Z",
    "updatedAt": "2026-01-10T09:51:29.525Z",
    "days": [
      {
        "id": "e3e77a87-7a29-49df-bac7-39695aa057b0",
        "planTemplateId": "e9dcd476-ec07-45d2-8b6c-587dd50c0bb3",
        "name": "Picioare",
        "sortOrder": 0,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": [
          {
            "id": "337bb0a1-0421-4b56-baaa-96113fdb6792",
            "templateDayId": "e3e77a87-7a29-49df-bac7-39695aa057b0",
            "recipeId": "79e57178-fc66-4d13-aed8-920815ebe076",
            "slotName": "Meal",
            "sortOrder": 0,
            "servings": 1
          },
          {
            "id": "d422e323-9cf5-4b5c-b9d0-a6fc7b04b3a0",
            "templateDayId": "e3e77a87-7a29-49df-bac7-39695aa057b0",
            "recipeId": "c8da5f11-134d-4817-8208-7176e1b1dc92",
            "slotName": "Meal",
            "sortOrder": 1,
            "servings": 1
          },
          {
            "id": "88e461d0-a734-43b2-b6af-d1355e538a43",
            "templateDayId": "e3e77a87-7a29-49df-bac7-39695aa057b0",
            "recipeId": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
            "slotName": "Meal",
            "sortOrder": 2,
            "servings": 1
          }
        ]
      },
      {
        "id": "ef3c068b-cc89-4e62-b009-5906cf945264",
        "planTemplateId": "e9dcd476-ec07-45d2-8b6c-587dd50c0bb3",
        "name": "Upper Body",
        "sortOrder": 1,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": [
          {
            "id": "02d3fc0c-b28d-4d4d-b92a-c50bb63e5516",
            "templateDayId": "ef3c068b-cc89-4e62-b009-5906cf945264",
            "recipeId": "79e57178-fc66-4d13-aed8-920815ebe076",
            "slotName": "Meal",
            "sortOrder": 0,
            "servings": 1
          },
          {
            "id": "ee641c56-7944-4154-8f1a-e11c382ad812",
            "templateDayId": "ef3c068b-cc89-4e62-b009-5906cf945264",
            "recipeId": "c8da5f11-134d-4817-8208-7176e1b1dc92",
            "slotName": "Meal",
            "sortOrder": 1,
            "servings": 1
          },
          {
            "id": "6b174142-b491-42ab-81ac-5c812af7a107",
            "templateDayId": "ef3c068b-cc89-4e62-b009-5906cf945264",
            "recipeId": "c6e33f00-5d5a-47e3-8ffa-40cfdb1a1695",
            "slotName": "Meal",
            "sortOrder": 2,
            "servings": 1
          }
        ]
      },
      {
        "id": "539e21db-48a3-4019-9adc-82ee01bf115a",
        "planTemplateId": "e9dcd476-ec07-45d2-8b6c-587dd50c0bb3",
        "name": "Day 3",
        "sortOrder": 2,
        "targetCalories": null,
        "targetProtein": null,
        "targetCarbs": null,
        "targetFat": null,
        "targetFiber": null,
        "meals": [
          {
            "id": "6cdb123d-35be-4a2f-8600-a9b4164fe744",
            "templateDayId": "539e21db-48a3-4019-9adc-82ee01bf115a",
            "recipeId": "79e57178-fc66-4d13-aed8-920815ebe076",
            "slotName": "Meal",
            "sortOrder": 0,
            "servings": 1
          },
          {
            "id": "c208809f-8d57-4f32-aca4-ced402521b4d",
            "templateDayId": "539e21db-48a3-4019-9adc-82ee01bf115a",
            "recipeId": "c8da5f11-134d-4817-8208-7176e1b1dc92",
            "slotName": "Meal",
            "sortOrder": 1,
            "servings": 1
          }
        ]
      }
    ]
  }
];
  for (const t of templates) {
      const existing = await prisma.planTemplate.findUnique({ where: { id: t.id } });
      if (!existing) {
          await prisma.planTemplate.create({
              data: {
                  id: t.id,
                  name: t.name,
                  isActive: t.isActive,
                  createdAt: t.createdAt,
                  updatedAt: t.updatedAt,
                  days: {
                      create: t.days.map(d => ({
                          id: d.id,
                          name: d.name,
                          sortOrder: d.sortOrder,
                          targetCalories: d.targetCalories,
                          targetProtein: d.targetProtein,
                          targetCarbs: d.targetCarbs,
                          targetFat: d.targetFat,
                          targetFiber: d.targetFiber,
                          meals: {
                              create: d.meals.map(m => ({
                                  id: m.id,
                                  recipeId: m.recipeId,
                                  slotName: m.slotName,
                                  sortOrder: m.sortOrder,
                                  servings: m.servings
                              }))
                          }
                      }))
                  }
              }
          })
      }
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
