<% if (header) { -%>
<%- include(header) %>
<% }             -%>

exports.setRoutes = function(App) {
<% routes.forEach(function(route) {    -%>
   App.post('<%- route.path %>', function(req, res) {
      <%- include(route.file, answers) %>
   })
<% }) -%>
}
