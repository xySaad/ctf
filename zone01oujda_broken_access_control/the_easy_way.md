# Overriding the network request

- Override the endpoint `api/object/oujda`

![network override](assets/network_override.png)

- Search for the exercise object in the JSON and enable code editor

```diff
 "adventure-abstract": {
                  "id": 102554,
                  "name": "AdventureAbstract",
                  "type": "exercise",
                  "attrs": {
+                   "codeEditor": { "enabled": true },
```
